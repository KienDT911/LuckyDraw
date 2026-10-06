import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCloud } from '../../shared/cloud';
import { requestPersistentStorage } from '../../shared/db';
import { MAX_SPIN_SECONDS, MIN_SPIN_SECONDS, newPrize, spinSecondsForRank } from '../../shared/defaults';
import { useT, type MessageKey } from '../../shared/i18n';
import { useCampaign, winnersOf } from '../../shared/store';
import { confirmDialog, toast } from '../../shared/ui/feedback';
import { Field, NumberInput, Select, TextInput, Toggle } from '../../shared/ui/fields';
import { Icon, type IconName } from '../../shared/ui/Icon';
import type { PhoneMask, Prize } from '../../types';
import { readBackupFile, restoreBackup, saveBackupFile } from '../backup/backup';
import { DesignStudio } from '../design/DesignStudio';
import { useEditor } from '../editor/editorStore';
import { downloadRemainingCsv, downloadRemainingXlsx, downloadWinnersXlsx } from '../import/exportFiles';
import { parseFile, type ParsedSheet } from '../import/parse';
import { useSpinUi } from '../spin/spinState';
import { ImportDialog } from './ImportDialog';

const STAGE_PRESETS = [
  { w: 1920, h: 1080 },
  { w: 1920, h: 960 },
  { w: 1280, h: 720 },
  { w: 2560, h: 1080 },
  { w: 1080, h: 1920 },
];

type TabId = 'campaign' | 'prizes' | 'data' | 'design';

const TABS: { id: TabId; label: MessageKey; icon: IconName }[] = [
  { id: 'campaign', label: 'tabCampaign', icon: 'sliders' },
  { id: 'prizes', label: 'tabPrizes', icon: 'gift' },
  { id: 'data', label: 'tabData', icon: 'users' },
  { id: 'design', label: 'tabDesign', icon: 'palette' },
];

export function SetupPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabId = TABS.some((x) => x.id === raw) ? (raw as TabId) : 'campaign';

  return (
    <div className={tab === 'design' ? 'setup setup-wide' : 'setup'}>
      <Summary />
      <nav className="tabs" role="tablist">
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            className={tab === x.id ? 'tab on' : 'tab'}
            onClick={() => setParams(x.id === 'campaign' ? {} : { tab: x.id }, { replace: true })}
          >
            <Icon name={x.icon} size={16} />
            {t(x.label)}
          </button>
        ))}
      </nav>
      <div className="tab-panel">
        {tab === 'campaign' && (
          <>
            <CampaignSection />
            <BackupSection />
          </>
        )}
        {tab === 'prizes' && <PrizesSection />}
        {tab === 'data' && <DataSection />}
        {tab === 'design' && <DesignStudio />}
      </div>
    </div>
  );
}

function Summary() {
  const t = useT();
  const name = useCampaign((s) => s.campaign.name);
  const prizes = useCampaign((s) => s.campaign.prizes);
  const poolCount = useCampaign((s) => s.poolCount);
  const drawn = useCampaign((s) => s.winners.length);
  const slots = prizes.reduce((n, p) => n + p.slots, 0);
  const stats: [number, MessageKey][] = [
    [prizes.length, 'heroPrizes'],
    [slots, 'heroSlots'],
    [poolCount, 'heroPool'],
    [drawn, 'heroDrawn'],
  ];
  return (
    <header className="setup-head">
      <div className="setup-title">
        <h1>{name || t('appName')}</h1>
        <div className="setup-stats">
          {stats.map(([n, label]) => (
            <span key={label}>
              <b>{n.toLocaleString()}</b> {t(label)}
            </span>
          ))}
        </div>
      </div>
      <Link className="btn btn-primary btn-lg" to="/spin">
        <Icon name="play" />
        {t('openStage')}
      </Link>
    </header>
  );
}

function Card({ title, desc, actions, children }: { title: string; desc?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {desc && <p className="muted">{desc}</p>}
        </div>
        {actions && <div className="row-gap">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

function CampaignSection() {
  const t = useT();
  const c = useCampaign((s) => s.campaign);
  const update = useCampaign((s) => s.update);
  const presetKey = STAGE_PRESETS.some((p) => p.w === c.stage.w && p.h === c.stage.h) ? `${c.stage.w}x${c.stage.h}` : 'custom';

  return (
    <Card title={t('campaignSection')}>
      <div className="form-grid">
        <Field label={t('campaignName')} wide>
          <TextInput value={c.name} onChange={(v) => update((d) => void (d.name = v))} />
        </Field>
        <Field label={t('stageSize')} wide>
          <div className="row-gap">
            <div className="grow">
              <Select
                value={presetKey}
                options={[
                  ...STAGE_PRESETS.map((p) => ({ value: `${p.w}x${p.h}`, label: `${p.w} × ${p.h}` })),
                  { value: 'custom', label: t('stageCustom') },
                ]}
                onChange={(v) => {
                  const [w, h] = v.split('x').map(Number);
                  if (w && h) update((d) => void (d.stage = { w, h }));
                }}
              />
            </div>
            <NumberInput value={c.stage.w} min={320} max={7680} onChange={(w) => update((d) => void (d.stage.w = w))} />
            <span className="muted">×</span>
            <NumberInput value={c.stage.h} min={240} max={7680} onChange={(h) => update((d) => void (d.stage.h = h))} />
          </div>
        </Field>
        <Field label={t('codeLength')}>
          <NumberInput value={c.codeLength} min={1} max={40} onChange={(v) => update((d) => void (d.codeLength = v))} />
        </Field>
        <Field label={t('phoneMask')}>
          <Select<PhoneMask>
            value={c.phoneMask}
            options={[
              { value: 'showLast4', label: t('maskShowLast4') },
              { value: 'hideLast4', label: t('maskHideLast4') },
              { value: 'none', label: t('maskNone') },
            ]}
            onChange={(v) => update((d) => void (d.phoneMask = v))}
          />
        </Field>
        <div className="switch-stack field-wide">
          <Toggle label={t('confetti')} checked={c.confetti} onChange={(v) => update((d) => void (d.confetti = v))} />
          <Toggle
            label={t('confirmBeforeSpin')}
            checked={c.confirmBeforeSpin}
            onChange={(v) => update((d) => void (d.confirmBeforeSpin = v))}
          />
        </div>
      </div>
    </Card>
  );
}

function PrizesSection() {
  const t = useT();
  const prizes = useCampaign((s) => s.campaign.prizes);
  const winners = useCampaign((s) => s.winners);
  const poolCount = useCampaign((s) => s.poolCount);
  const update = useCampaign((s) => s.update);

  const setPrize = (id: string, patch: Partial<Prize>) =>
    update((d) => {
      const p = d.prizes.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    });

  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.prizes.length) return;
      [d.prizes[i], d.prizes[j]] = [d.prizes[j], d.prizes[i]];
    });

  const remove = async (p: Prize) => {
    if (winnersOf(winners, p.id).length) return toast(t('prizeHasWinners'), 'error');
    if (await confirmDialog(`${t('delete')} “${p.name}”?`, { danger: true, okLabel: t('delete') })) {
      update((d) => void (d.prizes = d.prizes.filter((x) => x.id !== p.id)));
    }
  };

  const totalSlots = prizes.reduce((n, p) => n + p.slots, 0);
  const openSlots = prizes.reduce((n, p) => n + Math.max(0, p.slots - winnersOf(winners, p.id).length), 0);

  return (
    <Card
      title={t('prizesSection')}
      desc={t('prizesHint')}
      actions={
        <>
          <button
            className="btn btn-sm"
            onClick={() => update((d) => d.prizes.forEach((p, i) => (p.spinSeconds = spinSecondsForRank(i, d.prizes.length))))}
          >
            <Icon name="sparkle" size={14} />
            {t('autoSpinTimes')}
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => update((d) => void d.prizes.push({ ...newPrize(t('newPrizeName'), '', 1), spinSeconds: MIN_SPIN_SECONDS }))}
          >
            <Icon name="plus" size={14} />
            {t('addPrize')}
          </button>
        </>
      }
    >
      <div className="table-wrap">
        <table className="table prize-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('prizeName')}</th>
              <th>{t('prizeDesc')}</th>
              <th>{t('prizeSlots')}</th>
              <th>{t('prizeSpin')}</th>
              <th>{t('prizeGap')}</th>
              <th>{t('prizeDrawn')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {prizes.map((p, i) => {
              const drawn = winnersOf(winners, p.id).length;
              return (
                <tr key={p.id}>
                  <td className="rank">{i + 1}</td>
                  <td>
                    <TextInput value={p.name} onChange={(v) => setPrize(p.id, { name: v })} />
                  </td>
                  <td>
                    <TextInput value={p.description} onChange={(v) => setPrize(p.id, { description: v })} />
                  </td>
                  <td>
                    <NumberInput value={p.slots} min={Math.max(1, drawn)} max={10000} onChange={(v) => setPrize(p.id, { slots: v })} />
                  </td>
                  <td>
                    <NumberInput value={p.spinSeconds} min={1} max={30} step={0.5} onChange={(v) => setPrize(p.id, { spinSeconds: v })} />
                  </td>
                  <td>
                    <NumberInput value={p.gapSeconds} min={0} max={60} step={0.5} onChange={(v) => setPrize(p.id, { gapSeconds: v })} />
                  </td>
                  <td>
                    <span className={drawn >= p.slots ? 'pill pill-done' : drawn ? 'pill pill-partial' : 'pill'}>
                      {drawn}/{p.slots}
                    </span>
                  </td>
                  <td className="nowrap">
                    <button className="icon-btn" title={t('moveUp')} disabled={i === 0} onClick={() => move(i, -1)}>
                      <Icon name="chevronUp" />
                    </button>
                    <button className="icon-btn" title={t('moveDown')} disabled={i === prizes.length - 1} onClick={() => move(i, 1)}>
                      <Icon name="chevronDown" />
                    </button>
                    <button className="icon-btn danger" title={t('delete')} onClick={() => void remove(p)}>
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        {t('slotsTotal', { slots: totalSlots, pool: poolCount.toLocaleString() })} · {MIN_SPIN_SECONDS}–{MAX_SPIN_SECONDS}s
      </p>
      {openSlots > poolCount && poolCount > 0 && <p className="warn">{t('slotsWarn')}</p>}
    </Card>
  );
}

function DataSection() {
  const t = useT();
  const campaign = useCampaign((s) => s.campaign);
  const winners = useCampaign((s) => s.winners);
  const poolCount = useCampaign((s) => s.poolCount);
  const fileInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File) => {
    setBusy(true);
    try {
      const parsed = await parseFile(f);
      if (!parsed.rows.length) return toast(t('emptyFile'), 'error');
      setSheet(parsed);
    } catch (err) {
      toast(t('parseError', { msg: err instanceof Error ? err.message : String(err) }), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card title={t('dataSection')} desc={t('importHint')}>
        {/* The fixed file layout, as it looks in Excel. */}
        <div className="file-format">
          <span>
            <b>A</b>
            {t('colCode')} ({t('codeDigits', { len: campaign.codeLength })})
          </span>
          <span>
            <b>B</b>
            {t('colName')}
          </span>
          <span>
            <b>C</b>
            {t('colPhone')}
          </span>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">{t('poolCount')}</span>
            <span className="stat-num">{poolCount.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('winnersCount')}</span>
            <span className="stat-num">{winners.length.toLocaleString()}</span>
          </div>
          <div className="stat stat-wide">
            <span className="stat-label">{t('sourceFile')}</span>
            <span className="stat-file">{campaign.importedFileName || '—'}</span>
          </div>
        </div>
        <div className="row-gap">
          <button className="btn btn-primary" disabled={busy} onClick={() => fileInput.current?.click()}>
            <Icon name="upload" />
            {busy ? t('loading') : t('importFile')}
          </button>
          <a className="btn" href="./sample-customers.xlsx" download>
            <Icon name="download" />
            {t('sampleFile')}
          </a>
        </div>
        <p className="local-note">
          <Icon name="lock" size={14} />
          {t('dataLocalOnly')}
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void onFile(f);
          }}
        />
      </Card>

      <Card title={t('downloadsSection')} desc={t('downloadsHint')}>
        <div className="row-gap">
          <button className="btn" disabled={!poolCount} onClick={() => void downloadRemainingXlsx(campaign)}>
            <Icon name="download" />
            {t('downloadRemainingXlsx')}
          </button>
          <button className="btn" disabled={!poolCount} onClick={() => void downloadRemainingCsv(campaign)}>
            <Icon name="download" />
            {t('downloadRemainingCsv')}
          </button>
          <button className="btn" disabled={!winners.length} onClick={() => void downloadWinnersXlsx(campaign, winners)}>
            <Icon name="download" />
            {t('downloadWinners')}
          </button>
        </div>
      </Card>

      {sheet && (
        <ImportDialog
          sheet={sheet}
          onClose={() => setSheet(null)}
          onDone={(r) => {
            setSheet(null);
            toast(t('importDone', { n: r.imported.toLocaleString() }), 'success');
          }}
        />
      )}
    </>
  );
}

function BackupSection() {
  const t = useT();
  const cloud = useCloud((s) => s.mode === 'cloud');
  const fileInput = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void requestPersistentStorage().then(setPersisted);
  }, []);

  const afterReplace = async () => {
    useEditor.setState({ past: [], future: [], selectedId: null });
    useSpinUi.setState({ prizeId: null });
    await useCampaign.getState().reloadFromDb();
  };

  const onLoad = async (f: File) => {
    const data = await readBackupFile(f);
    if (!data) return toast(t('loadInvalid'), 'error');
    if (!(await confirmDialog(t(cloud ? 'loadConfirmCloud' : 'loadConfirm'), { danger: true }))) return;
    await restoreBackup(data);
    await afterReplace();
    toast(t('loadDone'), 'success');
  };

  const onNew = async () => {
    // With a shared design, only this computer's customer data is cleared; the design belongs to everyone.
    if (cloud) {
      if (!(await confirmDialog(t('newCampaignConfirmCloud'), { danger: true, okLabel: t('clearLocalData') }))) return;
      await useCampaign.getState().resetAll({ keepDesign: true });
      useSpinUi.setState({ prizeId: null });
      return;
    }
    if (!(await confirmDialog(t('newCampaignConfirm'), { danger: true, okLabel: t('newCampaign') }))) return;
    useEditor.setState({ past: [], future: [] });
    await useCampaign.getState().resetAll();
    await afterReplace();
  };

  return (
    <Card title={t('backupSection')} desc={t(cloud ? 'backupHintCloud' : 'backupHint')}>
      <div className="row-gap">
        <button className="btn btn-primary" onClick={() => void saveBackupFile()}>
          <Icon name="download" />
          {t('saveBackup')}
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" />
          {t('loadBackup')}
        </button>
        <button className="btn btn-danger" onClick={() => void onNew()}>
          <Icon name="trash" />
          {t(cloud ? 'clearLocalData' : 'newCampaign')}
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void onLoad(f);
        }}
      />
      {persisted !== null && (
        <p className={persisted ? 'muted small' : 'warn small'}>{t(persisted ? 'storagePersisted' : 'storageNotPersisted')}</p>
      )}
    </Card>
  );
}
