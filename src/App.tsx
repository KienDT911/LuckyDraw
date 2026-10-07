import { useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { lockApp, PasscodeGate, useGateEnabled } from './features/gate/PasscodeGate';
import { ResultsPage } from './features/results/ResultsPage';
import { SetupPage } from './features/setup/SetupPage';
import { SpinPage } from './features/spin/SpinPage';
import { discardChanges, saveDesign, signInAgain, startSync, useCloud } from './shared/cloud';
import { useLocale, useT, type MessageKey } from './shared/i18n';
import { useCampaign } from './shared/store';
import { ConfirmHost, ToastHost } from './shared/ui/feedback';
import { Icon, type IconName } from './shared/ui/Icon';

/**
 * Where the design is saved: this browser only, or the shared cloud copy. In the cloud, changes stay a draft
 * on this computer until Save is pressed; then everyone sees them.
 */
function SyncBadge() {
  const t = useT();
  const { mode, status, offline, savedAt, dirty, remoteNewer } = useCloud();
  const busy = status === 'saving' || status === 'conflict';

  // Ctrl+S saves the shared design.
  useEffect(() => {
    if (mode !== 'cloud') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (useCloud.getState().dirty) void saveDesign();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  if (mode !== 'cloud') {
    return (
      <span className="sync-badge" title={t('cloudLocalHint')}>
        <Icon name="monitor" size={14} />
        <span>{t('cloudLocal')}</span>
      </span>
    );
  }
  if (dirty && !offline && status !== 'expired') {
    return (
      <div className="save-group">
        <span className="sync-badge warn" title={t(remoteNewer ? 'cloudRemoteNewer' : 'cloudUnsavedHint')}>
          <Icon name={remoteNewer ? 'refresh' : 'pencil'} size={14} />
          <span>{t(remoteNewer ? 'cloudRemoteNewerBadge' : status === 'offline' ? 'cloudOffline' : 'cloudUnsaved')}</span>
        </span>
        <button className="btn btn-sm" onClick={() => void discardChanges()} disabled={busy}>
          {t('cloudDiscard')}
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => void saveDesign()} disabled={busy} title={t('cloudSaveHint')}>
          <Icon name="save" size={15} />
          <span>{busy ? t('cloudSaving') : t('cloudSave')}</span>
        </button>
      </div>
    );
  }
  const state = offline ? 'offline' : status;
  const view: Record<string, { label: MessageKey; icon: IconName; tone: string }> = {
    idle: { label: 'cloudSaving', icon: 'cloud', tone: '' },
    saving: { label: 'cloudSaving', icon: 'refresh', tone: '' },
    saved: { label: 'cloudSaved', icon: 'cloud', tone: 'ok' },
    offline: { label: 'cloudOffline', icon: 'cloudOff', tone: 'warn' },
    conflict: { label: 'cloudConflictBadge', icon: 'cloudOff', tone: 'warn' },
    expired: { label: 'cloudExpiredBadge', icon: 'lock', tone: 'bad' },
  };
  const v = view[state] ?? view.idle;
  const title = savedAt ? `${t(v.label)} · ${new Date(savedAt).toLocaleTimeString()}` : t(v.label);
  return state === 'expired' ? (
    <button className={`sync-badge ${v.tone}`} title={title} onClick={() => void signInAgain()}>
      <Icon name={v.icon} size={14} />
      <span>{t(v.label)}</span>
    </button>
  ) : (
    <span className={`sync-badge ${v.tone}`} title={title}>
      <Icon name={v.icon} size={14} />
      <span>{t(v.label)}</span>
    </span>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const gateEnabled = useGateEnabled();
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="gift" size={18} />
          </span>
          <span className="brand-name">{t('appName')}</span>
        </div>
        <nav className="topnav">
          <NavLink to="/setup">
            <Icon name="sliders" size={16} />
            <span>{t('navSetup')}</span>
          </NavLink>
          <NavLink to="/spin">
            <Icon name="monitor" size={16} />
            <span>{t('navSpin')}</span>
          </NavLink>
          <NavLink to="/results">
            <Icon name="trophy" size={16} />
            <span>{t('navResults')}</span>
          </NavLink>
        </nav>
        <div className="topbar-end">
          <SyncBadge />
          <div className="lang-switch">
            <button className={locale === 'vi' ? 'on' : ''} onClick={() => setLocale('vi')}>
              VI
            </button>
            <button className={locale === 'en' ? 'on' : ''} onClick={() => setLocale('en')}>
              EN
            </button>
          </div>
          {gateEnabled && (
            <button className="icon-btn" onClick={() => void lockApp()} title={t('lock')}>
              <Icon name="lock" />
            </button>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

/** Each page (and each Setup tab) opens at the top instead of inheriting the previous scroll position. */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

function HomeRedirect() {
  const hasData = useCampaign((s) => s.poolCount > 0 || s.winners.length > 0);
  return <Navigate to={hasData ? '/spin' : '/setup'} replace />;
}

export function App() {
  const ready = useCampaign((s) => s.ready);
  const cloudReady = useCloud((s) => s.mode === 'cloud' && s.authed);
  const t = useT();

  useEffect(() => {
    document.documentElement.lang = useLocale.getState().locale;
    void useCampaign.getState().init();
  }, []);

  // Share the design once this browser's campaign is loaded and it is signed in to the cloud.
  useEffect(() => {
    if (ready && cloudReady) void startSync();
  }, [ready, cloudReady]);

  return (
    <PasscodeGate>
      {!ready ? (
        <div className="loading">{t('loading')}</div>
      ) : (
        <HashRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route
              path="/setup"
              element={
                <AppShell>
                  <SetupPage />
                </AppShell>
              }
            />
            <Route path="/spin" element={<SpinPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      )}
      <ConfirmHost />
      <ToastHost />
    </PasscodeGate>
  );
}
