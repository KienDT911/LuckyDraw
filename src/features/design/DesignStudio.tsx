import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCloud } from '../../shared/cloud';
import { useT } from '../../shared/i18n';
import { SceneCanvas } from '../../shared/stage/SceneCanvas';
import { Stage } from '../../shared/stage/Stage';
import { useCampaign, winnersOf } from '../../shared/store';
import { Icon } from '../../shared/ui/Icon';
import { SaveControls } from '../../shared/ui/SaveControls';
import type { PageId } from '../../types';
import { EditorPanel } from '../editor/EditorPanel';
import { useEditor } from '../editor/editorStore';
import { setItemFrame } from '../editor/sceneOps';
import { useEditorKeys } from '../editor/useEditorKeys';
import { sampleCode, sampleWinners } from '../stage/sampleData';
import { resultsItems, spinItems } from '../stage/sceneItems';
import { confirmResetLayout, ThemeStrip } from '../theme/ThemeGallery';

/**
 * Setup → Giao diện: theme presets plus the layout designer for both the spin stage and the results board.
 * The live screens only present; all design work happens here.
 */
export function DesignStudio() {
  const t = useT();
  const campaign = useCampaign((s) => s.campaign);
  const winners = useCampaign((s) => s.winners);
  const cloud = useCloud((s) => s.mode === 'cloud');
  const { selectedId, select, snapshot } = useEditor();
  const [page, setPage] = useState<PageId>('spin');
  const rootRef = useRef<HTMLDivElement>(null);

  useEditorKeys(page);
  useEffect(() => () => select(null), [select]);

  const switchPage = (p: PageId) => {
    select(null);
    setPage(p);
  };

  // Preview with real results when there are any, otherwise with placeholders (never saved) so the layout
  // can be judged before the event.
  const usingSample = winners.length === 0;
  const previewWinners = useMemo(
    () => (usingSample ? sampleWinners(campaign.prizes, campaign.codeLength, campaign.charset) : winners),
    [usingSample, winners, campaign.prizes, campaign.codeLength, campaign.charset],
  );

  const firstPrize = campaign.prizes[0];
  const prizeCodes = firstPrize ? winnersOf(previewWinners, firstPrize.id).map((w) => w.code) : [];
  const items =
    page === 'spin'
      ? spinItems(
          campaign.scenes.spin,
          campaign,
          {
            prizeLabel: firstPrize?.name ?? t('selectPrize'),
            codes: prizeCodes.slice(0, Math.max(1, Math.min(3, firstPrize?.slots ?? 1))),
            slots: firstPrize?.slots ?? 0,
            reelCode: prizeCodes[0] ?? sampleCode(0, campaign.codeLength, campaign.charset),
          },
          t,
        )
      : resultsItems(campaign.scenes.results, campaign, previewWinners, t);

  return (
    <div className="design">
      <section className="card">
        <header className="card-head">
          <div>
            <h2>{t('templates')}</h2>
            <p className="muted">{t('themeHint')}</p>
          </div>
          <button className="btn btn-sm" onClick={() => void confirmResetLayout()}>
            <Icon name="refresh" size={14} />
            {t('resetLayout')}
          </button>
        </header>
        <ThemeStrip />
      </section>

      <div className="designer">
        <div className="designer-main">
          <div className="designer-bar">
            <div className="segmented" role="tablist">
              <button role="tab" aria-selected={page === 'spin'} className={page === 'spin' ? 'on' : ''} onClick={() => switchPage('spin')}>
                <Icon name="monitor" size={15} />
                {t('pageSpin')}
              </button>
              <button
                role="tab"
                aria-selected={page === 'results'}
                className={page === 'results' ? 'on' : ''}
                onClick={() => switchPage('results')}
              >
                <Icon name="trophy" size={15} />
                {t('pageResults')}
              </button>
            </div>
            {cloud ? <SaveControls /> : usingSample && <span className="designer-note">{t('previewSample')}</span>}
            <span className="designer-spacer" />
            <Link className="btn btn-sm" to={page === 'spin' ? '/spin' : '/results'}>
              {t('openScreen')}
              <Icon name="arrowUpRight" size={14} />
            </Link>
          </div>
          <div className="designer-canvas">
            <Stage width={campaign.stage.w} height={campaign.stage.h} rootRef={rootRef}>
              <SceneCanvas
                background={campaign.scenes[page].background}
                items={items}
                editing
                selectedId={selectedId}
                onSelect={select}
                onInteractionStart={(id) => snapshot(`drag:${id}:${Date.now()}`)}
                onFrameChange={(id, f) => setItemFrame(page, id, f)}
              />
            </Stage>
          </div>
          <p className="designer-hint">{t('editorKeysHint')}</p>
        </div>
        <EditorPanel page={page} />
      </div>
    </div>
  );
}
