import type { Ref } from 'react';
import type { TFunction } from '../../shared/i18n';
import { ElementView } from '../../shared/stage/ElementView';
import type { CanvasItem } from '../../shared/stage/SceneCanvas';
import { StageButton } from '../../shared/stage/StageButton';
import type { Campaign, ResultsScene, SceneElement, SpinScene, Winner } from '../../types';
import { ResultsBoard } from '../results/ResultsBoard';
import { PrizeBar } from '../spin/PrizeBar';
import { ReelRow, type ReelRowHandle } from '../spin/ReelRow';

/** What the spin stage currently shows. */
export interface SpinView {
  prizeLabel: string;
  /** Revealed codes of the selected prize, oldest first. */
  codes: string[];
  slots: number;
  /** Code shown in the reels while idle (null = idle characters). */
  reelCode: string | null;
}

type CampaignBits = Pick<Campaign, 'codeLength' | 'charset' | 'prizes' | 'phoneMask'>;

export function elementItems(elements: SceneElement[]): CanvasItem[] {
  return elements.map((el) => ({
    id: el.id,
    layer: 4,
    frame: el.frame,
    hidden: el.hidden,
    locked: el.locked,
    opacity: el.opacity,
    node: <ElementView el={el} />,
  }));
}

/**
 * Everything on the spin stage, layered: spin components (2), number boxes (3), user elements (4).
 * Used by the live spin page, the layout designer and theme previews, so they always match.
 */
export function spinItems(
  scene: SpinScene,
  campaign: CampaignBits,
  view: SpinView,
  t: TFunction,
  opts: { reelsRef?: Ref<ReelRowHandle>; onSpin?: () => void; onResults?: () => void; onPrize?: () => void } = {},
): CanvasItem[] {
  const c = scene.components;
  return [
    {
      id: 'reels',
      layer: 3,
      frame: c.reels.frame,
      hidden: c.reels.hidden,
      locked: false,
      node: (
        <ReelRow
          ref={opts.reelsRef}
          width={c.reels.frame.w}
          height={c.reels.frame.h}
          count={campaign.codeLength}
          code={view.reelCode}
          charset={campaign.charset}
          style={c.reels.style}
        />
      ),
    },
    {
      id: 'prizeBar',
      layer: 2,
      frame: c.prizeBar.frame,
      hidden: c.prizeBar.hidden,
      locked: false,
      // On the live stage, clicking the prize bar opens the prize picker.
      interactive: Boolean(opts.onPrize),
      node: (
        <div className={opts.onPrize ? 'prize-bar-wrap clickable' : 'prize-bar-wrap'} onClick={opts.onPrize}>
          <PrizeBar label={view.prizeLabel} codes={view.codes} drawn={view.codes.length} slots={view.slots} style={c.prizeBar.style} />
        </div>
      ),
    },
    {
      id: 'spinButton',
      layer: 2,
      frame: c.spinButton.frame,
      hidden: c.spinButton.hidden,
      locked: false,
      interactive: true,
      node: <StageButton style={c.spinButton.style} fallbackLabel={t('spin')} onClick={opts.onSpin} />,
    },
    {
      id: 'resultsButton',
      layer: 2,
      frame: c.resultsButton.frame,
      hidden: c.resultsButton.hidden,
      locked: false,
      interactive: true,
      node: <StageButton style={c.resultsButton.style} fallbackLabel={t('viewResults')} onClick={opts.onResults} />,
    },
    ...elementItems(scene.elements),
  ];
}

export function resultsItems(
  scene: ResultsScene,
  campaign: CampaignBits,
  winners: Winner[],
  t: TFunction,
  opts: { onBack?: () => void } = {},
): CanvasItem[] {
  const c = scene.components;
  return [
    {
      id: 'board',
      layer: 2,
      frame: c.board.frame,
      hidden: c.board.hidden,
      locked: false,
      node: (
        <ResultsBoard
          prizes={campaign.prizes}
          winners={winners}
          style={c.board.style}
          mask={campaign.phoneMask}
          width={c.board.frame.w}
          height={c.board.frame.h}
        />
      ),
    },
    {
      id: 'backButton',
      layer: 2,
      frame: c.backButton.frame,
      hidden: c.backButton.hidden,
      locked: false,
      interactive: true,
      noExport: true,
      node: <StageButton style={c.backButton.style} fallbackLabel={t('back')} onClick={opts.onBack} />,
    },
    ...elementItems(scene.elements),
  ];
}
