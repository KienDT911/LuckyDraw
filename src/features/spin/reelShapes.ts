import type { ReelShape } from '../../types';

/**
 * How each number-box shape is drawn. Shapes with a `path` are cut out with a CSS mask (an SVG drawn on a
 * 100×100 grid and stretched to the box), the others use border-radius.
 */
interface ShapeSpec {
  /** Fixed width ÷ height; the box is the largest one of that shape that fits its slot (centred). */
  aspect?: number;
  /** SVG content on a 100×100 grid, filled black. */
  path?: string;
  /** border-radius instead of a mask: 'style' = the radius setting, 'round' = fully round ends. */
  radius?: 'style' | 'round' | 'ellipse';
  /** The glyph is shrunk by this factor so it stays inside narrow shapes. */
  glyph: number;
}

const poly = (pts: string) => `<polygon points="${pts}"/>`;

export const REEL_SHAPES: Record<ReelShape, ShapeSpec> = {
  rect: { radius: 'style', glyph: 1 },
  square: { aspect: 1, radius: 'style', glyph: 1 },
  circle: { aspect: 1, radius: 'ellipse', glyph: 0.82 },
  oval: { radius: 'ellipse', glyph: 0.82 },
  pill: { radius: 'round', glyph: 0.9 },
  hexagon: { aspect: 1.1, path: poly('25,0 75,0 100,50 75,100 25,100 0,50'), glyph: 0.85 },
  diamond: { aspect: 0.85, path: poly('50,0 100,50 50,100 0,50'), glyph: 0.62 },
  star: { aspect: 1, path: poly('50,1 62,36 99,37 69,59 80,96 50,74 20,96 31,59 1,37 38,36'), glyph: 0.5 },
  heart: {
    aspect: 1.05,
    path: '<path d="M50 96C22 74 2 56 2 31 2 14 14 3 29 3c10 0 17 5 21 13 4-8 11-13 21-13 15 0 27 11 27 28 0 25-20 43-48 65z"/>',
    glyph: 0.62,
  },
  cloud: {
    aspect: 1.35,
    path: '<circle cx="27" cy="60" r="23"/><circle cx="52" cy="40" r="31"/><circle cx="76" cy="58" r="22"/><rect x="8" y="56" width="86" height="34" rx="17"/>',
    glyph: 0.68,
  },
  shield: { aspect: 0.85, path: '<path d="M50 2 96 15v33c0 26-20 42-46 50C24 90 4 74 4 48V15z"/>', glyph: 0.72 },
};

export const REEL_SHAPE_IDS = Object.keys(REEL_SHAPES) as ReelShape[];

const maskCache = new Map<string, string>();

/** CSS mask-image value for a path shape. */
export function shapeMask(shape: ReelShape): string | undefined {
  const path = REEL_SHAPES[shape]?.path;
  if (!path) return undefined;
  let url = maskCache.get(shape);
  if (!url) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${path}</svg>`;
    url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    maskCache.set(shape, url);
  }
  return url;
}
