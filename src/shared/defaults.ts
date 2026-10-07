import type {
  Background,
  Campaign,
  Frame,
  Prize,
  ResultsScene,
  SceneElement,
  SpinScene,
  SystemComponent,
  TextProps,
  TextRole,
} from '../types';
import { SANS_FONT } from './fonts';
import { uid } from './rng';
import { DEFAULT_THEME, findTheme, type Theme } from './themes';

export const MIN_SPIN_SECONDS = 3;
export const MAX_SPIN_SECONDS = 6;

export const frame = (x: number, y: number, w: number, h: number, rotation = 0): Frame => ({
  x,
  y,
  w,
  h,
  rotation,
});

/** Higher prizes (earlier in the list) spin longer: top = 6 s, bottom = 3 s. */
export function spinSecondsForRank(index: number, count: number): number {
  if (count <= 1) return MAX_SPIN_SECONDS;
  const t = index / (count - 1);
  return Math.round((MAX_SPIN_SECONDS - t * (MAX_SPIN_SECONDS - MIN_SPIN_SECONDS)) * 2) / 2;
}

export function newPrize(name: string, description: string, slots: number): Prize {
  return { id: uid('p_'), name, description, slots, spinSeconds: 4, gapSeconds: 2 };
}

function defaultPrizes(): Prize[] {
  const list = [
    newPrize('GIẢI ĐẶC BIỆT', '01 iPhone 17 Pro Max', 1),
    newPrize('GIẢI NHẤT', '01 Voucher du lịch', 2),
    newPrize('GIẢI NHÌ', '01 Loa Bluetooth', 5),
    newPrize('GIẢI BA', '01 Voucher mua sắm', 10),
  ];
  return list.map((p, i) => ({ ...p, spinSeconds: spinSecondsForRank(i, list.length) }));
}

export function defaultTextProps(overrides: Partial<TextProps> = {}): TextProps {
  return {
    text: 'Text',
    font: SANS_FONT,
    fontSize: 64,
    fontWeight: 700,
    italic: false,
    color: '#ffffff',
    color2: '',
    glow: '',
    uppercase: false,
    align: 'center',
    letterSpacing: 0,
    lineHeight: 1.15,
    strokeColor: '#000000',
    strokeWidth: 0,
    shadow: false,
    ...overrides,
  };
}

export function textElement(text: string, f: Frame, overrides: Partial<TextProps> = {}, role?: TextRole): SceneElement {
  return {
    id: uid('e_'),
    name: text.slice(0, 24),
    role,
    type: 'text',
    frame: f,
    opacity: 1,
    hidden: false,
    locked: false,
    props: defaultTextProps({ text, ...overrides }),
  };
}

const comp = <S,>(f: Frame, style: S): SystemComponent<S> => ({ frame: f, hidden: false, style });

function themeBackground(bg: Theme['spinBg']): Background {
  return { ...bg, imageId: null, fit: 'cover' };
}

// ---------- Default layout (1920 × 1080) ----------

export function buildSpinScene(th: Theme): SpinScene {
  return {
    background: themeBackground(th.spinBg),
    components: {
      reels: comp(frame(150, 420, 1620, 200), { ...th.reels, idleChar: '8', shape: 'rect' }),
      prizeBar: comp(frame(330, 690, 1260, 84), { ...th.prizeBar, maxVisible: 3, showCount: true }),
      spinButton: comp(frame(790, 826, 340, 92), { ...th.spinButton, label: '' }),
      resultsButton: comp(frame(830, 948, 260, 58), { ...th.resultsButton, label: '' }),
    },
    elements: [
      textElement('Lucky Draw · 2026', frame(460, 112, 1000, 50), { ...th.subtitle, fontSize: 28 }, 'subtitle'),
      textElement('Vòng Quay May Mắn', frame(210, 168, 1500, 200), { ...th.title, fontSize: 136, lineHeight: 1.1 }, 'title'),
    ],
  };
}

export function buildResultsScene(th: Theme): ResultsScene {
  return {
    background: themeBackground(th.resultsBg),
    components: {
      board: comp(frame(170, 262, 1580, 770), {
        ...th.board,
        columns: 2,
        showName: true,
        showPhone: true,
        showCode: true,
        hideEmpty: false,
      }),
      backButton: comp(frame(48, 44, 190, 56), { ...th.backButton, label: '' }),
    },
    elements: [
      textElement('Kết quả quay số', frame(460, 62, 1000, 44), { ...th.subtitle, fontSize: 26 }, 'subtitle'),
      textElement('Danh Sách Trúng Thưởng', frame(210, 104, 1500, 140), { ...th.title, fontSize: 96, lineHeight: 1.1 }, 'title'),
    ],
  };
}

export function defaultCampaign(theme: Theme = DEFAULT_THEME): Campaign {
  return {
    id: uid('c_'),
    name: 'Lucky Draw',
    stage: { w: 1920, h: 1080 },
    codeLength: 13,
    phoneMask: 'showLast4',
    confetti: true,
    confettiColors: theme.confetti,
    confirmBeforeSpin: true,
    themeId: theme.id,
    charset: '0123456789',
    headerRow: [],
    importedFileName: '',
    prizes: defaultPrizes(),
    scenes: { spin: buildSpinScene(theme), results: buildResultsScene(theme) },
    createdAt: Date.now(),
  };
}

// ---------- Themes ----------

/**
 * Restyles both pages with `th`. Positions, user images, labels and board content options are kept;
 * text elements with a role (title/subtitle) take the theme's typography.
 */
export function applyTheme(c: Campaign, th: Theme): void {
  const spin = c.scenes.spin.components;
  const res = c.scenes.results.components;

  c.scenes.spin.background = { ...themeBackground(th.spinBg), fit: c.scenes.spin.background.fit };
  c.scenes.results.background = { ...themeBackground(th.resultsBg), fit: c.scenes.results.background.fit };

  spin.reels.style = { ...th.reels, idleChar: spin.reels.style.idleChar, shape: spin.reels.style.shape };
  spin.prizeBar.style = { ...th.prizeBar, maxVisible: spin.prizeBar.style.maxVisible, showCount: spin.prizeBar.style.showCount };
  spin.spinButton.style = { ...th.spinButton, label: spin.spinButton.style.label };
  spin.resultsButton.style = { ...th.resultsButton, label: spin.resultsButton.style.label };
  res.backButton.style = { ...th.backButton, label: res.backButton.style.label };
  const b = res.board.style;
  res.board.style = {
    ...th.board,
    columns: b.columns,
    showName: b.showName,
    showPhone: b.showPhone,
    showCode: b.showCode,
    hideEmpty: b.hideEmpty,
  };

  for (const scene of [c.scenes.spin, c.scenes.results]) {
    for (const el of scene.elements) {
      if (el.type === 'text' && el.role) el.props = { ...el.props, ...th[el.role] };
    }
  }

  c.confettiColors = th.confetti;
  c.themeId = th.id;
}

/** Puts both pages back to the default composition, styled with `th`. */
export function resetLayout(c: Campaign, th: Theme): void {
  c.scenes = { spin: buildSpinScene(th), results: buildResultsScene(th) };
  c.confettiColors = th.confetti;
  c.themeId = th.id;
}

// ---------- Migration ----------

type AnyScene = SpinScene | ResultsScene;

function normalizeScene<S extends AnyScene>(raw: Partial<S> | undefined, base: S): S {
  if (!raw) return base;
  const baseComps = base.components as unknown as Record<string, SystemComponent<object>>;
  const rawComps = (raw.components ?? {}) as unknown as Record<string, Partial<SystemComponent<object>>>;
  const components: Record<string, SystemComponent<object>> = {};
  for (const [key, b] of Object.entries(baseComps)) {
    const r = rawComps[key];
    components[key] = r
      ? { frame: r.frame ?? b.frame, hidden: r.hidden ?? b.hidden, style: { ...b.style, ...r.style } }
      : b;
  }
  const elements = (raw.elements ?? []).map((el) =>
    el.type === 'text' ? { ...el, props: { ...defaultTextProps(), ...el.props } } : el,
  );
  return {
    ...base,
    background: { ...base.background, ...raw.background },
    components: components as unknown as S['components'],
    elements,
  } as S;
}

/** Fills fields added after a campaign was saved, so older campaigns and backups keep working. */
export function normalizeCampaign(raw: Campaign): Campaign {
  const base = defaultCampaign();
  const legacy = !('themeId' in raw);
  const c: Campaign = {
    ...base,
    ...raw,
    stage: { ...base.stage, ...raw.stage },
    prizes: raw.prizes ?? base.prizes,
    scenes: {
      spin: normalizeScene(raw.scenes?.spin, base.scenes.spin),
      results: normalizeScene(raw.scenes?.results, base.scenes.results),
    },
  };
  // Campaigns saved before themes existed get the themed default layout; their data and prizes are kept.
  if (legacy) resetLayout(c, DEFAULT_THEME);
  // A theme that has since been retired: restyle with the default theme, keeping the layout.
  else if (c.themeId && !findTheme(c.themeId)) applyTheme(c, DEFAULT_THEME);
  return c;
}
