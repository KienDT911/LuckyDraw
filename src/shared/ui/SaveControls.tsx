import { discardChanges, saveDesign, useCloud } from '../cloud';
import { useT } from '../i18n';
import { Icon } from './Icon';

/** Save / discard for the shared design (cloud only). Saved changes are what every other computer sees. */
export function SaveControls() {
  const t = useT();
  const { mode, status, dirty, remoteNewer } = useCloud();
  if (mode !== 'cloud') return null;
  const busy = status === 'saving' || status === 'conflict';
  const note = !dirty
    ? { text: t('cloudSaved'), tone: 'ok', icon: 'check' as const, hint: t('cloudSaved') }
    : remoteNewer
      ? { text: t('cloudRemoteNewerBadge'), tone: 'warn', icon: 'refresh' as const, hint: t('cloudRemoteNewer') }
      : status === 'offline'
        ? { text: t('cloudOffline'), tone: 'warn', icon: 'cloudOff' as const, hint: t('cloudSaveFailed') }
        : { text: t('cloudUnsaved'), tone: 'warn', icon: 'pencil' as const, hint: t('cloudUnsavedHint') };
  return (
    <div className="save-group">
      <span className={`sync-badge ${note.tone}`} title={note.hint}>
        <Icon name={note.icon} size={14} />
        <span>{note.text}</span>
      </span>
      {dirty && (
        <button className="btn btn-sm" onClick={() => void discardChanges()} disabled={busy}>
          {t('cloudDiscard')}
        </button>
      )}
      <button
        className={dirty ? 'btn btn-sm btn-primary' : 'btn btn-sm'}
        onClick={() => void saveDesign()}
        disabled={busy || !dirty || status === 'expired'}
        title={t('cloudSaveHint')}
      >
        <Icon name="save" size={15} />
        <span>{busy ? t('cloudSaving') : t('cloudSave')}</span>
      </button>
    </div>
  );
}
