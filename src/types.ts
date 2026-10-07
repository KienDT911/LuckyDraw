export type Locale = 'vi' | 'en';
export type PageId = 'spin' | 'results';
export type PhoneMask = 'showLast4' | 'hideLast4' | 'none';

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export interface Prize {
  id: string;
  /** Short label, e.g. "GIẢI NHẤT". */
  name: string;
  /** What is won, e.g. "01 MÁY ẢNH FUJIFILM INSTAX MINI 12". */
  description: string;
  slots: number;
  /** Time until the last reel stops for one winner. */
  spinSeconds: number;
  /** Pause after a winner is revealed before the next draw starts. */
  gapSeconds: number;
}

export type Decor = 'none' | 'spotlight' | 'sparkle' | 'rays' | 'deco';

export interface Background {
  color: string;
  /** Optional second colour for a vertical gradient ('' = solid). */
  color2: string;
  imageId: string | null;
  fit: 'cover' | 'contain' | 'fill';
  /** Generated ornament drawn over the colours/image, still under every component. */
  decor: Decor;
  decorColor: string;
  /** Thin double-line frame inset from the edges. */
  frame: boolean;
}

// ---- System components (layers 2 and 3) ----

/** Outline of each number box. `rect` and `square` use `radius` for their corners. */
export type ReelShape =
  | 'rect'
  | 'square'
  | 'circle'
  | 'oval'
  | 'pill'
  | 'hexagon'
  | 'diamond'
  | 'star'
  | 'heart'
  | 'cloud'
  | 'shield';

export interface ReelsStyle {
  shape: ReelShape;
  bg: string;
  /** Gradient end ('' = solid). */
  bg2: string;
  borderColor: string;
  /** Gradient end of the border ('' = solid). */
  borderColor2: string;
  /** Glow around the characters ('' = none). */
  glow: string;
  borderWidth: number;
  radius: number;
  color: string;
  font: string;
  /** Glyph height relative to the box height. */
  fontScale: number;
  gap: number;
  shadow: boolean;
  /** Character shown before the first spin. */
  idleChar: string;
}

export interface PrizeBarStyle {
  bg: string;
  color: string;
  borderColor: string;
  borderWidth: number;
  labelBg: string;
  labelBg2: string;
  labelColor: string;
  labelFont: string;
  radius: number;
  font: string;
  fontSize: number;
  letterSpacing: number;
  maxVisible: number;
  showCount: boolean;
}

export interface ButtonStyle {
  label: string;
  bg: string;
  bg2: string;
  /** Soft breathing halo ('' = none). */
  glow: string;
  letterSpacing: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  font: string;
  fontSize: number;
}

export interface BoardStyle {
  bg: string;
  bg2: string;
  /** Hairline frame inside the board and lines beside each prize label. */
  ornament: boolean;
  labelFont: string;
  labelBg2: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  padding: number;
  columns: 1 | 2;
  font: string;
  baseFontSize: number;
  labelBg: string;
  labelColor: string;
  descColor: string;
  textColor: string;
  showName: boolean;
  showPhone: boolean;
  showCode: boolean;
  hideEmpty: boolean;
}

export interface SystemComponent<S> {
  frame: Frame;
  hidden: boolean;
  style: S;
}

export interface SpinComponents {
  reels: SystemComponent<ReelsStyle>;
  prizeBar: SystemComponent<PrizeBarStyle>;
  spinButton: SystemComponent<ButtonStyle>;
  resultsButton: SystemComponent<ButtonStyle>;
}

export interface ResultsComponents {
  board: SystemComponent<BoardStyle>;
  backButton: SystemComponent<ButtonStyle>;
}

// ---- User elements (layer 4) ----

export interface TextProps {
  text: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  color: string;
  /** Gradient end for a metallic fill ('' = solid). */
  color2: string;
  glow: string;
  uppercase: boolean;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
}

export interface ImageProps {
  assetId: string | null;
  fit: 'contain' | 'cover' | 'fill';
  radius: number;
}

export interface ShapeProps {
  shape: 'rect' | 'ellipse';
  fill: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
}

/** Text elements with a role are restyled when a theme is applied. */
export type TextRole = 'title' | 'subtitle';

interface ElementBase {
  id: string;
  name: string;
  role?: TextRole;
  frame: Frame;
  opacity: number;
  hidden: boolean;
  locked: boolean;
}

export type SceneElement =
  | (ElementBase & { type: 'text'; props: TextProps })
  | (ElementBase & { type: 'image'; props: ImageProps })
  | (ElementBase & { type: 'shape'; props: ShapeProps });

export interface SpinScene {
  background: Background;
  components: SpinComponents;
  /** Index 0 is the bottom of the user layer. */
  elements: SceneElement[];
}

export interface ResultsScene {
  background: Background;
  components: ResultsComponents;
  elements: SceneElement[];
}

export interface Campaign {
  id: string;
  name: string;
  stage: { w: number; h: number };
  codeLength: number;
  phoneMask: PhoneMask;
  confetti: boolean;
  confettiColors: string[];
  confirmBeforeSpin: boolean;
  /** Last applied theme ('' = custom). */
  themeId: string;
  /** Characters the reels cycle through, derived from imported codes. */
  charset: string;
  /** Header row of the imported file (A, B, C) if it had one; [] when the data starts on row 1. */
  headerRow: string[];
  importedFileName: string;
  prizes: Prize[];
  scenes: { spin: SpinScene; results: ResultsScene };
  createdAt: number;
}

export interface Customer {
  id?: number;
  code: string;
  name: string;
  phone: string;
  /** Identity of a person: normalised phone, or the code when the phone is empty. */
  key: string;
}

export interface Winner {
  id?: number;
  prizeId: string;
  seq: number;
  code: string;
  name: string;
  phone: string;
  key: string;
  drawnAt: number;
}

export interface Asset {
  id: string;
  name: string;
  mime: string;
  blob: Blob;
}
