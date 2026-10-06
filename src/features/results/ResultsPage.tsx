import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dateStamp, fill, safeFileName } from '../../shared/format';
import { useT } from '../../shared/i18n';
import { SceneCanvas } from '../../shared/stage/SceneCanvas';
import { Stage } from '../../shared/stage/Stage';
import { flushSave, useCampaign } from '../../shared/store';
import { toast } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/Icon';
import { StageControls } from '../../shared/ui/StageControls';
import { resultsItems } from '../stage/sceneItems';
import { exportStagePdf, exportStagePng } from './exportImage';

const noop = () => {};

/** The live winners board. Layout is designed in Setup → Giao diện, never here. */
export function ResultsPage() {
  const t = useT();
  const navigate = useNavigate();
  const campaign = useCampaign((s) => s.campaign);
  const winners = useCampaign((s) => s.winners);
  const stageRootRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const scene = campaign.scenes.results;

  const doExport = async (kind: 'png' | 'pdf') => {
    const node = stageRootRef.current;
    if (!node) return;
    setExporting(true);
    try {
      await flushSave();
      await document.fonts?.ready;
      const name = `${safeFileName(campaign.name)}_results_${dateStamp()}`;
      if (kind === 'png') await exportStagePng(node, campaign.stage.w, campaign.stage.h, name);
      else await exportStagePdf(node, campaign.stage.w, campaign.stage.h, name);
    } catch (err) {
      toast(t('exportFailed', { msg: err instanceof Error ? err.message : String(err) }), 'error');
    } finally {
      setExporting(false);
    }
  };

  const items = resultsItems(scene, campaign, winners, t, { onBack: () => navigate('/spin') });

  return (
    <div className="stage-page" style={{ background: fill(scene.background.color, scene.background.color2) }}>
      <div className="stage-area">
        <StageControls busy={exporting}>
          <button className="tb-btn tb-primary" disabled={exporting} onClick={() => void doExport('png')}>
            <Icon name="image" />
            {exporting ? t('exporting') : t('exportPng')}
          </button>
          <button className="tb-btn tb-primary" disabled={exporting} onClick={() => void doExport('pdf')}>
            <Icon name="download" />
            {exporting ? t('exporting') : t('exportPdf')}
          </button>
          <span className="tb-sep" />
          <Link className="tb-btn" to="/spin">
            <Icon name="monitor" />
            {t('navSpin')}
          </Link>
          <Link className="tb-btn" to="/setup">
            <Icon name="exit" />
            {t('exit')}
          </Link>
        </StageControls>

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
