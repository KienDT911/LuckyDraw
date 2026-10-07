import type { Background, BoardStyle, ButtonStyle, Locale, PrizeBarStyle, ReelsStyle, TextProps } from '../types';
import { ROUNDED_FONT, SANS_FONT, UI_FONT } from './fonts';

type ThemeBackground = Omit<Background, 'imageId' | 'fit'>;
type ThemeButton = Omit<ButtonStyle, 'label'>;
export type ThemeText = Pick<
  TextProps,
  'font' | 'fontWeight' | 'italic' | 'color' | 'color2' | 'glow' | 'uppercase' | 'letterSpacing' | 'strokeColor' | 'strokeWidth' | 'shadow'
>;

export interface Theme {
  id: string;
  name: Record<Locale, string>;
  /** Main colour, used for the swatch in theme pickers. */
  accent: string;
  confetti: string[];
  spinBg: ThemeBackground;
  resultsBg: ThemeBackground;
  reels: Omit<ReelsStyle, 'idleChar' | 'shape'>;
  prizeBar: Omit<PrizeBarStyle, 'maxVisible' | 'showCount'>;
  spinButton: ThemeButton;
  resultsButton: ThemeButton;
  backButton: ThemeButton;
  board: Omit<BoardStyle, 'columns' | 'showName' | 'showPhone' | 'showCode' | 'hideEmpty'>;
  title: ThemeText;
  subtitle: ThemeText;
}

// ---------- Builders (keep each theme down to the colours that make it distinct) ----------

const title = (font: string, color: string, stroke: string, strokeWidth = 8): ThemeText => ({
  font,
  fontWeight: 800,
  italic: false,
  color,
  color2: '',
  glow: '',
  uppercase: false,
  letterSpacing: 0,
  strokeColor: stroke,
  strokeWidth,
  shadow: true,
});

const subtitle = (font: string, color: string): ThemeText => ({
  font,
  fontWeight: 700,
  italic: false,
  color,
  color2: '',
  glow: '',
  uppercase: true,
  letterSpacing: 8,
  strokeColor: '#000000',
  strokeWidth: 0,
  shadow: false,
});

const reels = (o: { bg: string; bg2?: string; border: string; borderWidth?: number; color: string; font: string; scale?: number }) => ({
  bg: o.bg,
  bg2: o.bg2 ?? '',
  borderColor: o.border,
  borderColor2: '',
  borderWidth: o.borderWidth ?? 4,
  radius: 18,
  color: o.color,
  glow: '',
  font: o.font,
  fontScale: o.scale ?? 0.78,
  gap: 14,
  shadow: true,
});

const prizeBar = (o: { label: string; labelColor: string; color: string; font: string; border?: string }) => ({
  bg: '#ffffff',
  color: o.color,
  borderColor: o.border ?? '#ffffff',
  borderWidth: o.border ? 2 : 0,
  labelBg: o.label,
  labelBg2: '',
  labelColor: o.labelColor,
  labelFont: o.font,
  radius: 16,
  font: SANS_FONT,
  fontSize: 28,
  letterSpacing: 1,
});

const button = (o: { bg: string; bg2?: string; color: string; border?: string; font: string; size: number; radius?: number }): ThemeButton => ({
  bg: o.bg,
  bg2: o.bg2 ?? '',
  glow: '',
  letterSpacing: 2,
  color: o.color,
  borderColor: o.border ?? '#000000',
  borderWidth: o.border ? 3 : 0,
  radius: o.radius ?? 18,
  font: o.font,
  fontSize: o.size,
});

const board = (o: { label: string; labelColor: string; desc: string; text: string; font: string; border?: string }) => ({
  bg: '#fffffff2',
  bg2: '',
  ornament: false,
  labelFont: o.font,
  labelBg: o.label,
  labelBg2: '',
  labelColor: o.labelColor,
  descColor: o.desc,
  textColor: o.text,
  borderColor: o.border ?? '#ffffff',
  borderWidth: o.border ? 3 : 0,
  radius: 28,
  padding: 40,
  font: UI_FONT,
  baseFontSize: 26,
});

// ---------- Presets ----------

export const THEMES: Theme[] = [
  {
    id: 'lucky-red',
    name: { vi: 'Đỏ May Mắn', en: 'Lucky Red' },
    accent: '#e8323c',
    confetti: ['#ffd23f', '#ffffff', '#ff4d6d', '#4dd4ff', '#7cff6b'],
    spinBg: { color: '#f0303c', color2: '#b3121c', decor: 'rays', decorColor: '#ffffff', frame: false },
    resultsBg: { color: '#f0303c', color2: '#b3121c', decor: 'sparkle', decorColor: '#ffe066', frame: false },
    reels: reels({ bg: '#ffe066', bg2: '#ffc61a', border: '#1f1f1f', borderWidth: 5, color: '#1f1f1f', font: ROUNDED_FONT, scale: 0.8 }),
    prizeBar: prizeBar({ label: '#ffcc00', labelColor: '#1f1f1f', color: '#333333', font: ROUNDED_FONT }),
    spinButton: button({ bg: '#ffe066', bg2: '#ffc400', color: '#b3121c', border: '#1f1f1f', font: ROUNDED_FONT, size: 40 }),
    resultsButton: button({ bg: '#ffffff', color: '#d0021b', font: SANS_FONT, size: 22, radius: 14 }),
    backButton: button({ bg: '#ffffff', color: '#d0021b', font: SANS_FONT, size: 22, radius: 14 }),
    board: board({ label: '#ffcc00', labelColor: '#b3121c', desc: '#c8102e', text: '#333333', font: ROUNDED_FONT }),
    title: title(ROUNDED_FONT, '#ffffff', '#1f1f1f'),
    subtitle: subtitle(ROUNDED_FONT, '#ffe066'),
  },
  {
    id: 'ocean-blue',
    name: { vi: 'Xanh Đại Dương', en: 'Ocean Blue' },
    accent: '#1e88e5',
    confetti: ['#ffd54f', '#ffffff', '#4fc3f7', '#ff7043', '#81c784'],
    spinBg: { color: '#2196f3', color2: '#0d47a1', decor: 'sparkle', decorColor: '#ffffff', frame: false },
    resultsBg: { color: '#1e88e5', color2: '#0d47a1', decor: 'spotlight', decorColor: '#bbdefb', frame: false },
    reels: reels({ bg: '#ffffff', bg2: '#e3f2fd', border: '#ffc107', color: '#0d47a1', font: SANS_FONT, scale: 0.66 }),
    prizeBar: prizeBar({ label: '#ff6d00', labelColor: '#ffffff', color: '#0d47a1', font: SANS_FONT }),
    spinButton: button({ bg: '#ffd54f', bg2: '#ffb300', color: '#0d47a1', font: SANS_FONT, size: 36, radius: 46 }),
    resultsButton: button({ bg: '#ffd54f', color: '#0d47a1', font: SANS_FONT, size: 22, radius: 30 }),
    backButton: button({ bg: '#ffffff', color: '#0d47a1', font: SANS_FONT, size: 22, radius: 30 }),
    board: board({ label: '#ff6d00', labelColor: '#ffffff', desc: '#0d47a1', text: '#263238', font: SANS_FONT }),
    title: title(SANS_FONT, '#ffffff', '#0d47a1', 6),
    subtitle: subtitle(SANS_FONT, '#ffe082'),
  },
  {
    id: 'golden-tet',
    name: { vi: 'Vàng Tết', en: 'Golden Tết' },
    accent: '#f9a825',
    confetti: ['#e53935', '#ffffff', '#ffb300', '#ff7043', '#fff59d'],
    spinBg: { color: '#ffe082', color2: '#ffb300', decor: 'rays', decorColor: '#fff8e1', frame: false },
    resultsBg: { color: '#fff3c4', color2: '#ffd54f', decor: 'sparkle', decorColor: '#e53935', frame: false },
    reels: reels({ bg: '#e53935', bg2: '#c62828', border: '#fff3c4', color: '#fff3c4', font: ROUNDED_FONT }),
    prizeBar: prizeBar({ label: '#e53935', labelColor: '#fff8e1', color: '#b71c1c', font: ROUNDED_FONT, border: '#e53935' }),
    spinButton: button({ bg: '#ef5350', bg2: '#c62828', color: '#fff8e1', border: '#fff3c4', font: ROUNDED_FONT, size: 40, radius: 46 }),
    resultsButton: button({ bg: '#ffffff', color: '#c62828', font: SANS_FONT, size: 22, radius: 30 }),
    backButton: button({ bg: '#ffffff', color: '#c62828', font: SANS_FONT, size: 22, radius: 30 }),
    board: board({ label: '#e53935', labelColor: '#fff8e1', desc: '#c62828', text: '#4e342e', font: ROUNDED_FONT }),
    title: title(ROUNDED_FONT, '#e53935', '#ffffff'),
    subtitle: subtitle(ROUNDED_FONT, '#c62828'),
  },
  {
    id: 'fresh-green',
    name: { vi: 'Xanh Tươi', en: 'Fresh Green' },
    accent: '#16a34a',
    confetti: ['#ffd600', '#ffffff', '#69f0ae', '#40c4ff', '#ff8a65'],
    spinBg: { color: '#3fbf6a', color2: '#12813f', decor: 'sparkle', decorColor: '#ffffff', frame: false },
    resultsBg: { color: '#e9f9ef', color2: '#c3ecd2', decor: 'sparkle', decorColor: '#3fbf6a', frame: false },
    reels: reels({ bg: '#ffffff', border: '#0e7a3c', color: '#0e7a3c', font: SANS_FONT, scale: 0.66 }),
    prizeBar: prizeBar({ label: '#ffd600', labelColor: '#1b5e20', color: '#1b5e20', font: SANS_FONT }),
    spinButton: button({ bg: '#ffe14d', bg2: '#ffc400', color: '#1b5e20', font: SANS_FONT, size: 36, radius: 46 }),
    resultsButton: button({ bg: '#ffffff', color: '#12813f', font: SANS_FONT, size: 22, radius: 30 }),
    backButton: button({ bg: '#ffffff', color: '#12813f', font: SANS_FONT, size: 22, radius: 30 }),
    board: board({ label: '#12813f', labelColor: '#ffffff', desc: '#12813f', text: '#263238', font: SANS_FONT, border: '#a5d6a7' }),
    title: title(SANS_FONT, '#ffffff', '#0e7a3c', 6),
    subtitle: subtitle(SANS_FONT, '#fff59d'),
  },
  {
    id: 'sunny-orange',
    name: { vi: 'Cam Năng Động', en: 'Sunny Orange' },
    accent: '#fb8c00',
    confetti: ['#ffffff', '#fff176', '#ff5252', '#40c4ff', '#b2ff59'],
    spinBg: { color: '#ffa726', color2: '#f4511e', decor: 'rays', decorColor: '#ffffff', frame: false },
    resultsBg: { color: '#fff3e0', color2: '#ffcc80', decor: 'sparkle', decorColor: '#fb8c00', frame: false },
    reels: reels({ bg: '#ffffff', bg2: '#fff3e0', border: '#bf360c', color: '#e65100', font: ROUNDED_FONT }),
    prizeBar: prizeBar({ label: '#bf360c', labelColor: '#ffffff', color: '#bf360c', font: ROUNDED_FONT }),
    spinButton: button({ bg: '#fff59d', bg2: '#ffee58', color: '#bf360c', border: '#bf360c', font: ROUNDED_FONT, size: 40, radius: 46 }),
    resultsButton: button({ bg: '#ffffff', color: '#e65100', font: SANS_FONT, size: 22, radius: 30 }),
    backButton: button({ bg: '#ffffff', color: '#e65100', font: SANS_FONT, size: 22, radius: 30 }),
    board: board({ label: '#f4511e', labelColor: '#ffffff', desc: '#e65100', text: '#3e2723', font: ROUNDED_FONT }),
    title: title(ROUNDED_FONT, '#ffffff', '#bf360c'),
    subtitle: subtitle(ROUNDED_FONT, '#fff59d'),
  },
  {
    id: 'sweet-pink',
    name: { vi: 'Hồng Ngọt Ngào', en: 'Sweet Pink' },
    accent: '#ec407a',
    confetti: ['#ffffff', '#ffd1e0', '#ff4f8b', '#ffd54f', '#b388ff'],
    spinBg: { color: '#ff8fb5', color2: '#ec407a', decor: 'sparkle', decorColor: '#ffffff', frame: false },
    resultsBg: { color: '#fff0f5', color2: '#ffd1e0', decor: 'sparkle', decorColor: '#ec407a', frame: false },
    reels: reels({ bg: '#ffffff', border: '#c2185b', color: '#c2185b', font: ROUNDED_FONT }),
    prizeBar: prizeBar({ label: '#c2185b', labelColor: '#ffffff', color: '#c2185b', font: ROUNDED_FONT }),
    spinButton: button({ bg: '#ffffff', bg2: '#ffe3ee', color: '#c2185b', border: '#c2185b', font: ROUNDED_FONT, size: 40, radius: 46 }),
    resultsButton: button({ bg: '#ffffff', color: '#c2185b', font: SANS_FONT, size: 22, radius: 30 }),
    backButton: button({ bg: '#ffffff', color: '#c2185b', font: SANS_FONT, size: 22, radius: 30 }),
    board: board({ label: '#ec407a', labelColor: '#ffffff', desc: '#c2185b', text: '#4a2333', font: ROUNDED_FONT }),
    title: title(ROUNDED_FONT, '#ffffff', '#c2185b'),
    subtitle: subtitle(ROUNDED_FONT, '#ffffff'),
  },
  {
    id: 'lavender',
    name: { vi: 'Tím Oải Hương', en: 'Lavender' },
    accent: '#7e57c2',
    confetti: ['#ffd54f', '#ffffff', '#b388ff', '#80d8ff', '#ff80ab'],
    spinBg: { color: '#9c7ae0', color2: '#5e35b1', decor: 'spotlight', decorColor: '#ffffff', frame: false },
    resultsBg: { color: '#f3eefe', color2: '#ddd0fb', decor: 'sparkle', decorColor: '#7e57c2', frame: false },
    reels: reels({ bg: '#ffffff', border: '#ffc107', color: '#5e35b1', font: SANS_FONT, scale: 0.66 }),
    prizeBar: prizeBar({ label: '#ffd54f', labelColor: '#4527a0', color: '#4527a0', font: SANS_FONT }),
    spinButton: button({ bg: '#ffd54f', bg2: '#ffb300', color: '#4527a0', font: SANS_FONT, size: 36, radius: 46 }),
    resultsButton: button({ bg: '#ffffff', color: '#5e35b1', font: SANS_FONT, size: 22, radius: 30 }),
    backButton: button({ bg: '#ffffff', color: '#5e35b1', font: SANS_FONT, size: 22, radius: 30 }),
    board: board({ label: '#7e57c2', labelColor: '#ffffff', desc: '#5e35b1', text: '#311b92', font: SANS_FONT }),
    title: title(SANS_FONT, '#ffffff', '#4527a0', 6),
    subtitle: subtitle(SANS_FONT, '#ffe082'),
  },
  {
    id: 'clean-white',
    name: { vi: 'Trắng Tinh Gọn', en: 'Clean White' },
    accent: '#e8323c',
    confetti: ['#e8323c', '#ffc107', '#2196f3', '#4caf50', '#ff4081'],
    spinBg: { color: '#ffffff', color2: '#eef2f8', decor: 'none', decorColor: '#e8323c', frame: false },
    resultsBg: { color: '#ffffff', color2: '#eef2f8', decor: 'none', decorColor: '#e8323c', frame: false },
    reels: reels({ bg: '#ffffff', bg2: '#f4f6fa', border: '#e8323c', borderWidth: 3, color: '#e8323c', font: SANS_FONT, scale: 0.64 }),
    prizeBar: prizeBar({ label: '#e8323c', labelColor: '#ffffff', color: '#1f2937', font: SANS_FONT, border: '#e5e7eb' }),
    spinButton: button({ bg: '#e8323c', color: '#ffffff', font: SANS_FONT, size: 34, radius: 46 }),
    resultsButton: {
      ...button({ bg: '#ffffff', color: '#e8323c', font: SANS_FONT, size: 22, radius: 30 }),
      borderColor: '#e8323c',
      borderWidth: 2,
    },
    backButton: {
      ...button({ bg: '#ffffff', color: '#e8323c', font: SANS_FONT, size: 22, radius: 30 }),
      borderColor: '#e8323c',
      borderWidth: 2,
    },
    board: board({ label: '#e8323c', labelColor: '#ffffff', desc: '#e8323c', text: '#1f2937', font: SANS_FONT, border: '#e5e7eb' }),
    title: { ...title(SANS_FONT, '#e8323c', '#ffffff', 0), shadow: false },
    subtitle: subtitle(SANS_FONT, '#6b7280'),
  },
];

export const DEFAULT_THEME = THEMES[0];

export function findTheme(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}
