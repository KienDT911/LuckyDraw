import { produce } from 'immer';
import { create } from 'zustand';
import type { Campaign, Winner } from '../types';
import { db, loadCampaign, saveCampaign } from './db';
import { defaultCampaign, normalizeCampaign } from './defaults';
import { prepareImage } from './images';
import { uid } from './rng';

interface CampaignState {
  ready: boolean;
  campaign: Campaign;
  winners: Winner[];
  poolCount: number;
  assetUrls: Record<string, string>;
  init: () => Promise<void>;
  update: (recipe: (draft: Campaign) => void) => void;
  /** Replace the whole campaign (used by undo/redo and backup restore). */
  replace: (campaign: Campaign) => void;
  addWinner: (w: Winner) => void;
  refreshPoolCount: () => Promise<void>;
  /** Prepares (compresses) and stores an uploaded image; throws when the image is unusable. */
  addAsset: (file: Blob, name: string) => Promise<string>;
  /** Stores an image that came from the cloud under its existing id. */
  cacheAsset: (id: string, blob: Blob) => Promise<void>;
  reloadFromDb: () => Promise<void>;
  /** keepDesign: clear only this browser's customer list and winners (cloud mode). */
  resetAll: (opts?: { keepDesign?: boolean }) => Promise<void>;
}

/** Lets the cloud sync upload new images as soon as they are added. */
export const assetEvents: { added?: (id: string) => void } = {};

let initPromise: Promise<void> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSave: Campaign | null = null;

function scheduleSave(c: Campaign) {
  pendingSave = c;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 250);
}

export async function flushSave(): Promise<void> {
  clearTimeout(saveTimer);
  const c = pendingSave;
  pendingSave = null;
  if (c) await saveCampaign(c);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushSave());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSave();
  });
}

export function referencedAssetIds(c: Campaign): Set<string> {
  const ids = new Set<string>();
  for (const scene of [c.scenes.spin, c.scenes.results]) {
    if (scene.background.imageId) ids.add(scene.background.imageId);
    for (const el of scene.elements) if (el.type === 'image' && el.props.assetId) ids.add(el.props.assetId);
  }
  return ids;
}

async function loadAssetUrls(): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const a of await db.assets.toArray()) urls[a.id] = URL.createObjectURL(a.blob);
  return urls;
}

async function readAll(): Promise<Pick<CampaignState, 'campaign' | 'winners' | 'poolCount' | 'assetUrls'>> {
  const stored = await loadCampaign();
  const campaign = stored ? normalizeCampaign(stored) : defaultCampaign();
  await saveCampaign(campaign);
  // Drop images no longer used by any layout.
  const used = referencedAssetIds(campaign);
  const stale = (await db.assets.toCollection().primaryKeys()).filter((id) => !used.has(id));
  if (stale.length) await db.assets.bulkDelete(stale);

  const winners = await db.winners.orderBy('id').toArray();
  const poolCount = await db.customers.count();
  return { campaign, winners, poolCount, assetUrls: await loadAssetUrls() };
}

export const useCampaign = create<CampaignState>((set, get) => ({
  ready: false,
  campaign: defaultCampaign(),
  winners: [],
  poolCount: 0,
  assetUrls: {},

  init: () => {
    initPromise ??= readAll().then((data) => set({ ...data, ready: true }));
    return initPromise;
  },

  update: (recipe) => {
    const next = produce(get().campaign, recipe);
    set({ campaign: next });
    scheduleSave(next);
  },

  replace: (campaign) => {
    set({ campaign });
    scheduleSave(campaign);
  },

  addWinner: (w) => set({ winners: [...get().winners, w], poolCount: Math.max(0, get().poolCount - 1) }),

  refreshPoolCount: async () => set({ poolCount: await db.customers.count() }),

  addAsset: async (file, name) => {
    const blob = await prepareImage(file);
    const id = uid('a_');
    await db.assets.put({ id, name, mime: blob.type || file.type, blob });
    set({ assetUrls: { ...get().assetUrls, [id]: URL.createObjectURL(blob) } });
    assetEvents.added?.(id);
    return id;
  },

  cacheAsset: async (id, blob) => {
    if (get().assetUrls[id]) return;
    await db.assets.put({ id, name: id, mime: blob.type, blob });
    set({ assetUrls: { ...get().assetUrls, [id]: URL.createObjectURL(blob) } });
  },

  reloadFromDb: async () => {
    await flushSave();
    for (const url of Object.values(get().assetUrls)) URL.revokeObjectURL(url);
    set({ ...(await readAll()) });
  },

  resetAll: async ({ keepDesign = false } = {}) => {
    if (keepDesign) {
      await db.transaction('rw', [db.customers, db.winners], async () => {
        await Promise.all([db.customers.clear(), db.winners.clear()]);
      });
      // Forget the imported file too; the (shared) design itself is untouched.
      get().update((d) => {
        d.importedFileName = '';
        d.headerRow = [];
        d.charset = '0123456789';
      });
      set({ winners: [], poolCount: 0 });
      return;
    }
    clearTimeout(saveTimer);
    pendingSave = null;
    await db.transaction('rw', [db.meta, db.customers, db.winners, db.assets], async () => {
      await Promise.all([db.meta.clear(), db.customers.clear(), db.winners.clear(), db.assets.clear()]);
    });
    await get().reloadFromDb();
  },
}));

export function winnersOf(winners: Winner[], prizeId: string): Winner[] {
  return winners.filter((w) => w.prizeId === prizeId).sort((a, b) => a.seq - b.seq);
}
