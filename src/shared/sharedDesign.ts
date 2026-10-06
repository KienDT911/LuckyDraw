/**
 * What is shared through the cloud — and, just as important, what is not.
 *
 * SHARED (saved to Cloudflare, identical for everyone): campaign name, screen size, code length, phone
 * display mode, confetti / confirmation options, theme, prizes, and the spin + results layouts (including
 * the images they use).
 *
 * NEVER SHARED (stays in this browser): the customer list, winners, and everything derived from the imported
 * file (its name, its header row, the code characters).
 *
 * This module is used by both the browser and the Cloudflare function, so the same whitelist is enforced on
 * both sides. It must stay free of DOM and app imports.
 */
import type { Campaign, PhoneMask, Prize, ResultsScene, SpinScene } from '../types';

export interface SharedDesign {
  name: string;
  stage: { w: number; h: number };
  codeLength: number;
  phoneMask: PhoneMask;
  confetti: boolean;
  confettiColors: string[];
  confirmBeforeSpin: boolean;
  themeId: string;
  prizes: Prize[];
  scenes: { spin: SpinScene; results: ResultsScene };
}

export const ASSET_ID_RE = /^a_[0-9a-f]{16}$/;

function prizeOf(p: Prize): Prize {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    slots: p.slots,
    spinSeconds: p.spinSeconds,
    gapSeconds: p.gapSeconds,
  };
}

/** Builds the shared part of a campaign field by field (a whitelist, never a copy-and-delete). */
export function toSharedDesign(c: Campaign): SharedDesign {
  return {
    name: c.name,
    stage: { w: c.stage.w, h: c.stage.h },
    codeLength: c.codeLength,
    phoneMask: c.phoneMask,
    confetti: c.confetti,
    confettiColors: [...c.confettiColors],
    confirmBeforeSpin: c.confirmBeforeSpin,
    themeId: c.themeId,
    prizes: c.prizes.map(prizeOf),
    scenes: {
      spin: sceneOf(c.scenes.spin),
      results: sceneOf(c.scenes.results),
    },
  };
}

function sceneOf<S extends SpinScene | ResultsScene>(s: S): S {
  return { background: s.background, components: s.components, elements: s.elements } as S;
}

// ---------- Server-side validation (never trust the client) ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const int = (v: unknown, min: number, max: number, fallback: number) => Math.round(num(v, min, max, fallback));

const MAX_PRIZES = 500;
const MAX_ELEMENTS = 500;

function sanitizeScene(v: unknown): Obj | null {
  if (!isObj(v) || !isObj(v.background) || !isObj(v.components) || !Array.isArray(v.elements)) return null;
  if (v.elements.length > MAX_ELEMENTS || !v.elements.every(isObj)) return null;
  // Only the three scene parts are kept; anything else a client might add is dropped.
  return { background: v.background, components: v.components, elements: v.elements };
}

/** Rebuilds a design from untrusted input using the whitelist; returns null when it is not a valid design. */
export function sanitizeSharedDesign(input: unknown): SharedDesign | null {
  if (!isObj(input) || !isObj(input.scenes) || !Array.isArray(input.prizes)) return null;
  const spin = sanitizeScene(input.scenes.spin);
  const results = sanitizeScene(input.scenes.results);
  if (!spin || !results || input.prizes.length > MAX_PRIZES) return null;

  const prizes: Prize[] = [];
  for (const p of input.prizes) {
    if (!isObj(p) || typeof p.id !== 'string' || !p.id) return null;
    prizes.push({
      id: str(p.id, 64),
      name: str(p.name, 200),
      description: str(p.description, 500),
      slots: int(p.slots, 1, 100_000, 1),
      spinSeconds: num(p.spinSeconds, 0.5, 60, 4),
      gapSeconds: num(p.gapSeconds, 0, 120, 2),
    });
  }
  const stage = isObj(input.stage) ? input.stage : {};
  const mask = input.phoneMask;
  return {
    name: str(input.name, 200),
    stage: { w: int(stage.w, 320, 7680, 1920), h: int(stage.h, 240, 7680, 1080) },
    codeLength: int(input.codeLength, 1, 40, 13),
    phoneMask: mask === 'hideLast4' || mask === 'none' ? mask : 'showLast4',
    confetti: input.confetti !== false,
    confettiColors: Array.isArray(input.confettiColors)
      ? input.confettiColors.filter((c): c is string => typeof c === 'string').slice(0, 12).map((c) => c.slice(0, 32))
      : [],
    confirmBeforeSpin: input.confirmBeforeSpin !== false,
    themeId: str(input.themeId, 64),
    prizes,
    scenes: { spin: spin as unknown as SpinScene, results: results as unknown as ResultsScene },
  };
}

/** Image ids a design refers to (backgrounds and image elements). */
export function designAssetIds(d: Pick<SharedDesign, 'scenes'>): string[] {
  const ids = new Set<string>();
  for (const scene of [d.scenes.spin, d.scenes.results] as unknown as Obj[]) {
    const bg = scene.background as Obj | undefined;
    if (bg && typeof bg.imageId === 'string' && ASSET_ID_RE.test(bg.imageId)) ids.add(bg.imageId);
    for (const el of (scene.elements as Obj[] | undefined) ?? []) {
      const props = el.props as Obj | undefined;
      if (el.type === 'image' && props && typeof props.assetId === 'string' && ASSET_ID_RE.test(props.assetId)) {
        ids.add(props.assetId);
      }
    }
  }
  return [...ids];
}
