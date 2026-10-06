import confetti from 'canvas-confetti';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fill, sleep } from '../../shared/format';
import { t as tNow, useT } from '../../shared/i18n';
import { SceneCanvas } from '../../shared/stage/SceneCanvas';
import { Stage } from '../../shared/stage/Stage';
import { useCampaign, winnersOf } from '../../shared/store';
import { confirmDialog, toast } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/Icon';
import { StageControls } from '../../shared/ui/StageControls';
import type { Prize } from '../../types';
import { saveBackupFile } from '../backup/backup';
import { drawOne } from '../draw/drawEngine';
import { isTypingTarget } from '../editor/useEditorKeys';
import { spinItems } from '../stage/sceneItems';
import { PrizePicker } from './PrizePicker';
import { useSpinUi } from './spinState';
import type { ReelRowHandle } from './ReelRow';

let shoot: confetti.CreateTypes | undefined;

/** Confetti draws on its own canvas from a worker, so the main thread stays free for the reels. */
function getConfetti(): confetti.CreateTypes {
  if (!shoot) {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);
    shoot = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
  }
  return shoot;
}

function fireConfetti(colors: string[]) {
  const fire = getConfetti();
  const shapes: confetti.Shape[] = ['circle', 'square', 'star'];
  const base = { colors, shapes, ticks: 260, gravity: 0.9, scalar: 1.05 };
  void fire({ ...base, particleCount: 150, spread: 100, startVelocity: 55, origin: { x: 0.5, y: 0.55 } });
  void fire({ ...base, particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.85 } });
  void fire({ ...base, particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.85 } });
}

const noop = () => {};

/** The live stage shown to the audience. Layout is designed in Setup → Giao diện, never here. */
export function SpinPage() {
  const t = useT();
  const navigate = useNavigate();
  const campaign = useCampaign((s) => s.campaign);
  const winners = useCampaign((s) => s.winners);
  const poolCount = useCampaign((s) => s.poolCount);
  const ui = useSpinUi();
  const reelsRef = useRef<ReelRowHandle>(null);
  const stageRootRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef(false);
  const aliveRef = useRef(true);
  /** True from the moment a spin is requested until its run ends (covers the confirmation dialog). */
  const startingRef = useRef(false);

  const scene = campaign.scenes.spin;
  const prize = campaign.prizes.find((p) => p.id === ui.prizeId) ?? null;
  const prizeWinners = prize ? winnersOf(winners, prize.id) : [];
  const revealed = prizeWinners.filter((w) => w.id !== ui.pendingId);
  const remaining = prize ? Math.max(0, prize.slots - prizeWinners.length) : 0;

  // Default to the first prize that still has open slots.
  useEffect(() => {
    if (prize) return;
    const open = campaign.prizes.find((p) => winnersOf(winners, p.id).length < p.slots) ?? campaign.prizes[0];
    if (open) useSpinUi.setState({ prizeId: open.id });
  }, [prize, campaign.prizes, winners]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      pauseRef.current = false;
      useSpinUi.setState({ running: false, paused: false, pendingId: null });
    };
  }, []);

  const run = useCallback(async (p: Prize) => {
    // Only one draw loop may ever run.
    if (useSpinUi.getState().running) return;
    pauseRef.current = false;
    useSpinUi.setState({ running: true, paused: false });
    let completed = false;
    try {
      for (;;) {
        while (pauseRef.current && aliveRef.current) await sleep(120);
        if (!aliveRef.current) return;

        const current = useCampaign.getState().campaign.prizes.find((x) => x.id === p.id) ?? p;
        const result = await drawOne(current);
        if (result.kind === 'prizeFull') {
          completed = true;
          break;
        }
        if (result.kind === 'poolEmpty') {
          toast(tNow('poolEmpty'), 'error');
          break;
        }

        const w = result.winner;
        useSpinUi.setState({ pendingId: w.id ?? null });
        useCampaign.getState().addWinner(w);
        void useCampaign.getState().refreshPoolCount();

        const reels = reelsRef.current;
        if (reels) await reels.spin(w.code, current.spinSeconds);
        else await sleep(current.spinSeconds * 1000);
        if (!aliveRef.current) return;

        useSpinUi.setState({ pendingId: null });
        const { confetti: confettiOn, confettiColors } = useCampaign.getState().campaign;
        if (confettiOn) fireConfetti(confettiColors);

        if (winnersOf(useCampaign.getState().winners, p.id).length >= current.slots) {
          completed = true;
          break;
        }
        await sleep(current.gapSeconds * 1000);
      }
    } finally {
      useSpinUi.setState({ running: false, paused: false, pendingId: null });
    }
    if (completed && aliveRef.current) {
      toast(tNow('backupReminder', { prize: p.name }), 'success', {
        label: tNow('saveBackup'),
        run: () => void saveBackupFile(),
      });
    }
  }, []);

  const startSpin = useCallback(async () => {
    if (startingRef.current || useSpinUi.getState().running) return;
    if (!prize) return toast(t('noPrize'));
    if (remaining <= 0) return toast(t('prizeComplete', { prize: prize.name }));
    if (poolCount === 0) return toast(t(winners.length ? 'poolEmpty' : 'noData'), 'error');
    startingRef.current = true;
    try {
      if (campaign.confirmBeforeSpin) {
        const ok = await confirmDialog(t('spinConfirm', { n: Math.min(remaining, poolCount), prize: prize.name }), {
          okLabel: t('spin'),
        });
        if (!ok) return;
      }
      await run(prize);
    } finally {
      startingRef.current = false;
    }
  }, [prize, remaining, poolCount, winners.length, campaign.confirmBeforeSpin, run, t]);

  const togglePause = useCallback(() => {
    if (!useSpinUi.getState().running) return;
    pauseRef.current = !pauseRef.current;
    useSpinUi.setState({ paused: pauseRef.current });
  }, []);

  // Space / Enter spins, P pauses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore auto-repeat, keys a dialog already handled, and typing.
      if (e.repeat || e.defaultPrevented || isTypingTarget(e.target) || document.querySelector('.modal-backdrop')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        void startSpin();
      } else if (e.key.toLowerCase() === 'p') {
        togglePause();
      } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !useSpinUi.getState().running) {
        e.preventDefault();
        const list = useCampaign.getState().campaign.prizes;
        const i = list.findIndex((p) => p.id === useSpinUi.getState().prizeId);
        const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
        if (next) useSpinUi.setState({ prizeId: next.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startSpin, togglePause]);

  const [picking, setPicking] = useState(false);

  const items = spinItems(
    scene,
    campaign,
    {
      prizeLabel: prize?.name ?? t('selectPrize'),
      codes: revealed.map((w) => w.code),
      slots: prize?.slots ?? 0,
      reelCode: revealed.at(-1)?.code ?? null,
    },
    t,
    {
      reelsRef,
      // While drawing, the stage button pauses/resumes instead of starting another spin.
      onSpin: () => (ui.running ? togglePause() : void startSpin()),
      onResults: () => !ui.running && navigate('/results'),
      onPrize: () => !ui.running && setPicking(true),
    },
  );

  return (
    // The page behind the stage takes the stage colour, so letterboxing blends in instead of showing black bars.
    <div className="stage-page" style={{ background: fill(scene.background.color, scene.background.color2) }}>
      <div className="stage-area">
        <StageControls>
          <span className="tb-status">
            {ui.paused
              ? t('pausedInfo', { n: remaining })
              : ui.running
                ? t('spinning')
                : prize
                  ? `${prize.name} · ${remaining} ${t('remaining')}`
                  : ''}
          </span>
          <span className="tb-sep" />
          <Link className={ui.running ? 'tb-btn disabled' : 'tb-btn'} to="/results">
            <Icon name="trophy" />
            {t('navResults')}
          </Link>
          <Link className={ui.running ? 'tb-btn disabled' : 'tb-btn'} to="/setup">
            <Icon name="exit" />
            {t('exit')}
          </Link>
        </StageControls>

        {picking && (
          <PrizePicker
            prizes={campaign.prizes}
            winners={winners}
            currentId={ui.prizeId}
            onPick={(id) => {
              useSpinUi.setState({ prizeId: id });
              setPicking(false);
            }}
            onClose={() => setPicking(false)}
          />
        )}

        {poolCount === 0 && winners.length === 0 && (
          <div className="stage-notice" data-noexport>
            <span>{t('noData')}</span>
            <Link className="btn btn-primary btn-sm" to="/setup?tab=data">
              {t('navSetup')}
              <Icon name="arrowUpRight" size={14} />
            </Link>
          </div>
        )}

        <Stage width={campaign.stage.w} height={campaign.stage.h} rootRef={stageRootRef}>
          <SceneCanvas
            background={scene.background}
            items={items}
            editing={false}
            selectedId={null}
            onSelect={noop}
            onFrameChange={noop}
            onInteractionStart={noop}
          />
        </Stage>
      </div>
    </div>
  );
}
