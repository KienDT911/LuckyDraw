import { useState, type ReactNode } from 'react';
import { PASSCODE_SHA256 } from '../../config';
import { canUnlockOffline, detectCloud, loginCloud, logoutCloud, unlockOffline, useCloud } from '../../shared/cloud';
import { useLocale, useT, type MessageKey } from '../../shared/i18n';
import { Icon } from '../../shared/ui/Icon';

const SESSION_KEY = 'ld-unlocked';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function readLocalUnlocked(): boolean {
  if (!PASSCODE_SHA256) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === PASSCODE_SHA256;
  } catch {
    return false;
  }
}

/** Signs out (cloud) or forgets the unlock (local), then shows the passcode screen again. */
export async function lockApp(): Promise<void> {
  if (useCloud.getState().mode === 'cloud') await logoutCloud();
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  location.reload();
}

export function useGateEnabled(): boolean {
  return useCloud((s) => s.mode === 'cloud') || Boolean(PASSCODE_SHA256);
}

/**
 * Cloud (Cloudflare): the passcode is the APP_PASSCODE secret and is checked by the server, which then gives
 * this browser a session for the design API. Local (no backend): the cosmetic hash in src/config.ts.
 */
export function PasscodeGate({ children }: { children: ReactNode }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const cloud = useCloud();
  const [localUnlocked, setLocalUnlocked] = useState(readLocalUnlocked);
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(false);

  if (cloud.mode === 'checking') return <div className="loading">{t('loading')}</div>;
  if (cloud.mode === 'local' && localUnlocked) return <>{children}</>;
  if (cloud.mode === 'cloud' && (cloud.authed || cloud.offline)) return <>{children}</>;

  const unreachable = cloud.mode === 'cloud' && !cloud.reachable;
  const unconfigured = cloud.mode === 'cloud' && cloud.reachable && !cloud.configured;
  const offlineForm = unreachable && canUnlockOffline();
  const showForm = !unconfigured && (!unreachable || offlineForm);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (cloud.mode === 'local') {
        if ((await sha256(value)) === PASSCODE_SHA256) {
          try {
            sessionStorage.setItem(SESSION_KEY, PASSCODE_SHA256);
          } catch {
            /* unlock for this page load only */
          }
          setLocalUnlocked(true);
          return;
        }
        setMessage('passWrong');
      } else if (offlineForm) {
        if (!(await unlockOffline(value))) setMessage('passWrong');
      } else {
        const result = await loginCloud(value);
        if (result === 'wrong') setMessage('passWrong');
        else if (result === 'unreachable') setMessage('gateUnreachable');
      }
      setValue('');
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    await detectCloud();
    setBusy(false);
  };

  return (
    <div className="gate">
      <form
        className="gate-card"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <span className="monogram">
          <Icon name="gift" size={28} />
        </span>
        <h1>{t('appName')}</h1>

        {unconfigured && <p className="gate-note">{t('gateUnconfigured')}</p>}
        {unreachable && <p className="gate-note">{t(offlineForm ? 'gateOfflineHint' : 'gateUnreachable')}</p>}

        {showForm && (
          <>
            <p className="muted">{t('passTitle')}</p>
            <input
              className={message === 'passWrong' ? 'input gate-input shake' : 'input gate-input'}
              type="password"
              autoFocus
              value={value}
              placeholder={t('passPlaceholder')}
              onChange={(e) => {
                setValue(e.target.value);
                setMessage(null);
              }}
            />
            {message && <p className="gate-error">{t(message)}</p>}
            <button className="btn btn-primary btn-lg gate-btn" type="submit" disabled={busy || !value}>
              {busy ? t('loading') : t(offlineForm ? 'gateOfflineContinue' : 'passSubmit')}
            </button>
          </>
        )}
        {(unreachable || unconfigured) && (
          <button type="button" className="btn gate-btn" disabled={busy} onClick={() => void retry()}>
            <Icon name="refresh" />
            {t('retry')}
          </button>
        )}
        <button type="button" className="btn btn-link btn-sm" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}>
          {locale === 'vi' ? 'English' : 'Tiếng Việt'}
        </button>
      </form>
    </div>
  );
}
