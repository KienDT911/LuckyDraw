/**
 * Cloud sync of the shared design (Cloudflare Pages Functions + D1, see /functions).
 *
 * Only the whitelisted design (see sharedDesign.ts) ever leaves the browser. Customer lists and winners stay in
 * IndexedDB on the drawing computer.
 *
 * Design changes are a draft in this browser until someone presses Save (`saveDesign`); only then do they become
 * the shared design that every other computer loads (on opening, and by polling every 15 s). Without a backend (plain `vite dev`, static hosting) the app runs in
 * "local" mode exactly as before.
 */
import { create } from 'zustand';
import { useEditor } from '../features/editor/editorStore';
import { useSpinUi } from '../features/spin/spinState';
import type { Campaign, Winner } from '../types';
import { db, loadSyncMeta, saveSyncMeta } from './db';
import { normalizeCampaign } from './defaults';
import { t } from './i18n';
import { designAssetIds, toSharedDesign, type SharedDesign } from './sharedDesign';
import { assetEvents, useCampaign } from './store';
import { confirmDialog, toast } from './ui/feedback';

export type CloudMode = 'checking' | 'local' | 'cloud';
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'conflict' | 'expired';

interface CloudState {
  mode: CloudMode;
  /** Cloud mode: the server answered. */
  reachable: boolean;
  /** Cloud mode: the D1 binding and the APP_PASSCODE secret are set up. */
  configured: boolean;
  authed: boolean;
  /** Unlocked while the server could not be reached; sync is paused. */
  offline: boolean;
  status: SyncStatus;
  savedAt: number | null;
  /** This browser has design changes that are not saved to the cloud yet (press Save to share them). */
  dirty: boolean;
  /** Someone saved a newer design while this browser has unsaved changes. */
  remoteNewer: boolean;
}

export const useCloud = create<CloudState>(() => ({
  mode: 'checking',
  reachable: true,
  configured: true,
  authed: false,
  offline: false,
  status: 'idle',
  savedAt: null,
  dirty: false,
  remoteNewer: false,
}));

const POLL_MS = 15_000;
const RECONNECT_MS = 30_000;
const CLOUD_FLAG = 'ld-cloud';
const OFFLINE_KEY = 'ld-offline-key';

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** Relative path, so the API is found next to the page wherever it is hosted. */
async function api(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`api/${path}`, {
      credentials: 'same-origin',
      ...init,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(init.headers as Record<string, string> | undefined) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Detection & sign-in ----------

/** Works out whether this site has the Cloudflare backend, and whether this browser is signed in. */
export async function detectCloud(): Promise<void> {
  try {
    const res = await api('session', {}, 8_000);
    if ((res.headers.get('Content-Type') ?? '').includes('application/json')) {
      const body = (await res.json()) as { cloud?: boolean; configured?: boolean; authed?: boolean };
      if (body.cloud) {
        storageSet(CLOUD_FLAG, '1');
        useCloud.setState({ mode: 'cloud', reachable: true, configured: body.configured !== false, authed: Boolean(body.authed) });
        return;
      }
    }
    // A cloud site whose server is having trouble right now.
    if (res.status >= 500 && storageGet(CLOUD_FLAG)) {
      useCloud.setState({ mode: 'cloud', reachable: false });
      return;
    }
    // No backend here (dev server, static hosting): everything stays in this browser.
    useCloud.setState({ mode: 'local' });
  } catch {
    useCloud.setState(storageGet(CLOUD_FLAG) ? { mode: 'cloud', reachable: false } : { mode: 'local' });
  }
}

async function digest(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export type LoginResult = 'ok' | 'wrong' | 'unreachable' | 'unconfigured';

export async function loginCloud(passcode: string): Promise<LoginResult> {
  try {
    const res = await api('session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    if (res.status === 401) return 'wrong';
    if (res.status === 503) {
      useCloud.setState({ configured: false });
      return 'unconfigured';
    }
    if (!res.ok) return 'unreachable';
    // Remember a salted hash so this computer can still be unlocked if the server is unreachable later.
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
    storageSet(OFFLINE_KEY, `${salt}:${await digest(`${salt}:${passcode}`)}`);
    useCloud.setState({ authed: true, reachable: true, offline: false });
    return 'ok';
  } catch {
    useCloud.setState({ reachable: false });
    return 'unreachable';
  }
}

export function canUnlockOffline(): boolean {
  return Boolean(storageGet(OFFLINE_KEY));
}

/** Server unreachable: unlock with the passcode last used on this computer. Sync resumes when it is back. */
export async function unlockOffline(passcode: string): Promise<boolean> {
  const [salt, hash] = (storageGet(OFFLINE_KEY) ?? '').split(':');
  if (!salt || !hash || (await digest(`${salt}:${passcode}`)) !== hash) return false;
  useCloud.setState({ offline: true });
  watchReconnect();
  return true;
}

export async function logoutCloud(): Promise<void> {
  try {
    await api('session', { method: 'DELETE' });
  } catch {
    /* signing out locally is enough */
  }
}

let reconnectTimer: ReturnType<typeof setInterval> | undefined;

function watchReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(async () => {
    try {
      const res = await api('session', {}, 8_000);
      const body = (await res.json()) as { authed?: boolean };
      if (!body.authed) return;
      clearInterval(reconnectTimer);
      reconnectTimer = undefined;
      useCloud.setState({ authed: true, offline: false, reachable: true });
    } catch {
      /* still offline */
    }
  }, RECONNECT_MS);
}

// ---------- Sync engine ----------

interface RemoteDesign {
  version: number;
  design: SharedDesign | null;
}

let started = false;
/** Cloud version this browser's design is based on. */
let baseVersion = 0;
/** The shared design at `baseVersion`; anything else locally is an unsaved edit. */
let syncedJson = '';
let pushing = false;
let resolving = false;
let dirtyTimer: ReturnType<typeof setTimeout> | undefined;

const currentJson = () => JSON.stringify(toSharedDesign(useCampaign.getState().campaign));
const isDirty = () => currentJson() !== syncedJson;
const onSetupPage = () => location.hash.startsWith('#/setup');

function setStatus(status: SyncStatus) {
  useCloud.setState(status === 'saved' ? { status, savedAt: Date.now() } : { status });
}

function refreshDirty() {
  clearTimeout(dirtyTimer);
  const dirty = started && syncedJson !== '' && isDirty();
  if (useCloud.getState().dirty !== dirty) useCloud.setState({ dirty });
}

async function remember(version: number, json: string) {
  baseVersion = version;
  syncedJson = json;
  useCloud.setState({ remoteNewer: false });
  await saveSyncMeta({ version, json });
  refreshDirty();
}

/** Merges the shared design into this browser's campaign; local-only fields (imported file etc.) are kept. */
export function mergeDesign(local: Campaign, shared: SharedDesign, winners: Winner[]): Campaign {
  const sharedIds = new Set(shared.prizes.map((p) => p.id));
  // A prize that already has winners on this computer is never dropped, even if someone deleted it elsewhere.
  const kept = local.prizes.filter((p) => !sharedIds.has(p.id) && winners.some((w) => w.prizeId === p.id));
  return normalizeCampaign({ ...local, ...shared, prizes: [...shared.prizes, ...kept] });
}

async function fetchDesign(ifNotVersion?: number): Promise<RemoteDesign | 'unchanged' | 'expired' | null> {
  try {
    const res = await api('design', ifNotVersion ? { headers: { 'If-None-Match': `"v${ifNotVersion}"` } } : {});
    if (res.status === 304) return 'unchanged';
    if (res.status === 401) {
      onExpired();
      return 'expired';
    }
    if (!res.ok) return null;
    return (await res.json()) as RemoteDesign;
  } catch {
    return null;
  }
}

function onExpired() {
  if (useCloud.getState().status === 'expired') return;
  setStatus('expired');
  if (onSetupPage()) {
    toast(t('cloudExpired'), 'error', { label: t('signInAgain'), run: () => void signInAgain() });
  }
}

export async function signInAgain(): Promise<void> {
  await logoutCloud();
  location.reload();
}

/** Downloads images the design uses that this browser does not have yet. */
async function syncAssets() {
  const { campaign, assetUrls } = useCampaign.getState();
  for (const id of designAssetIds(toSharedDesign(campaign))) {
    if (assetUrls[id]) continue;
    try {
      const res = await api(`assets/${id}`, { headers: { Accept: 'image/*' } });
      if (res.ok) await useCampaign.getState().cacheAsset(id, await res.blob());
    } catch {
      /* retried on the next poll */
    }
  }
}

async function uploadAsset(id: string): Promise<void> {
  const asset = await db.assets.get(id);
  if (!asset) return;
  try {
    await api(`assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': asset.blob.type || asset.mime || 'application/octet-stream' },
      body: asset.blob,
    });
  } catch {
    /* the next design save reports it as missing and it is uploaded then */
  }
}

async function applyRemote(remote: RemoteDesign, announce: boolean) {
  if (!remote.design) return;
  const { campaign, winners } = useCampaign.getState();
  useCampaign.getState().replace(mergeDesign(campaign, remote.design, winners));
  // Undo must not bring back what another computer just changed.
  useEditor.setState({ past: [], future: [] });
  await remember(remote.version, currentJson());
  setStatus('saved');
  void syncAssets();
  if (announce && onSetupPage()) toast(t('cloudUpdated'), 'info');
}

async function resolveConflict(remote: RemoteDesign): Promise<boolean> {
  if (resolving) return false;
  resolving = true;
  setStatus('conflict');
  try {
    // Closing the dialog (Esc / click outside) keeps the other person's work — the safe choice.
    const keepMine = await confirmDialog(t('cloudConflict'), { okLabel: t('cloudKeepMine'), cancelLabel: t('cloudUseLatest') });
    if (keepMine) {
      baseVersion = remote.version;
      resolving = false;
      return await push();
    }
    await applyRemote(remote, false);
    return false;
  } finally {
    resolving = false;
  }
}

/** Uploads this browser's design as the new shared version. Returns true when it is saved. */
async function push(): Promise<boolean> {
  if (resolving || pushing || useCloud.getState().status === 'expired') return false;
  const json = currentJson();
  if (baseVersion > 0 && json === syncedJson) {
    setStatus('saved');
    return true;
  }
  pushing = true;
  setStatus('saving');
  try {
    const res = await api('design', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: `{"baseVersion":${baseVersion},"design":${json}}`,
    });
    if (res.status === 409) {
      // Someone saved first: ask whether to replace their version or take it.
      const latest = (await res.json()) as RemoteDesign;
      pushing = false;
      return await resolveConflict(latest);
    }
    if (res.status === 401) {
      onExpired();
      return false;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { version: number; missingAssets?: string[] };
    await remember(body.version, json);
    // Images the server does not have yet (e.g. added while offline).
    for (const id of body.missingAssets ?? []) await uploadAsset(id);
    setStatus('saved');
    return true;
  } catch {
    setStatus('offline');
    return false;
  } finally {
    pushing = false;
  }
}

/** The Save button: shares this browser's design with everyone. */
export async function saveDesign(): Promise<void> {
  if (!started || pushing || resolving) return;
  if (useCloud.getState().status === 'expired') {
    toast(t('cloudExpired'), 'error', { label: t('signInAgain'), run: () => void signInAgain() });
    return;
  }
  if (await push()) toast(t('cloudSavedToast'), 'success');
  else if (useCloud.getState().status === 'offline') toast(t('cloudSaveFailed'), 'error');
}

/** Throws away unsaved changes and goes back to the shared design (the newest one if someone saved since). */
export async function discardChanges(): Promise<void> {
  if (!started || !syncedJson || !isDirty()) return;
  if (!(await confirmDialog(t('cloudDiscardConfirm'), { okLabel: t('cloudDiscard'), danger: true }))) return;
  const { campaign, winners } = useCampaign.getState();
  useCampaign.getState().replace(mergeDesign(campaign, JSON.parse(syncedJson) as SharedDesign, winners));
  useEditor.setState({ past: [], future: [] });
  refreshDirty();
  await poll();
}

async function poll(): Promise<void> {
  if (!started || resolving || pushing || document.visibilityState === 'hidden') return;
  if (useCloud.getState().status === 'expired') return;
  const remote = await fetchDesign(baseVersion || undefined);
  if (remote === 'expired') return;
  if (remote === null) {
    setStatus('offline');
    return;
  }
  if (remote === 'unchanged') {
    if (useCloud.getState().status === 'offline') setStatus('saved');
    void syncAssets();
    return;
  }
  if (!remote.design) {
    // The cloud is empty (e.g. a new database): publish this browser's design.
    baseVersion = 0;
    await push();
    return;
  }
  if (remote.version === baseVersion) return;
  // Never change the stage in the middle of a draw; the next poll picks it up.
  if (useSpinUi.getState().running) return;
  if (baseVersion === 0 || !isDirty()) {
    await applyRemote(remote, true);
  } else if (!useCloud.getState().remoteNewer) {
    // Do not interrupt someone who is editing; pressing Save asks what to do.
    useCloud.setState({ remoteNewer: true });
    if (onSetupPage()) toast(t('cloudRemoteNewer'), 'info');
  }
}

async function initialSync(): Promise<void> {
  const remote = await fetchDesign();
  if (remote === 'expired' || remote === 'unchanged') return;
  if (remote === null) {
    setStatus('offline');
    return;
  }
  if (!remote.design) {
    // First computer to connect: its design becomes the shared one.
    baseVersion = 0;
    await push();
    return;
  }
  if (remote.version === baseVersion) {
    // Changes left unsaved last time stay a draft until Save is pressed.
    setStatus('saved');
    refreshDirty();
    void syncAssets();
    return;
  }
  // The cloud is newer. Take it unless this browser has edits that were never saved.
  if (baseVersion === 0 || !isDirty()) await applyRemote(remote, false);
  else await resolveConflict(remote);
}

/** Starts syncing once the campaign is loaded and the browser is signed in. Safe to call more than once. */
export async function startSync(): Promise<void> {
  if (started) return;
  started = true;
  const meta = await loadSyncMeta();
  baseVersion = meta?.version ?? 0;
  syncedJson = meta?.json ?? '';

  assetEvents.added = (id) => void uploadAsset(id);
  useCampaign.subscribe((s, prev) => {
    if (s.campaign === prev.campaign) return;
    // Comparing the whole design is cheap, but not on every pixel of a drag.
    clearTimeout(dirtyTimer);
    dirtyTimer = setTimeout(refreshDirty, 250);
  });
  window.addEventListener('online', () => void poll());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void poll();
  });
  // Warn before closing the tab with changes nobody else can see yet.
  window.addEventListener('beforeunload', (e) => {
    refreshDirty();
    if (useCloud.getState().dirty) e.preventDefault();
  });

  await initialSync();
  setInterval(() => void poll(), POLL_MS);
}

