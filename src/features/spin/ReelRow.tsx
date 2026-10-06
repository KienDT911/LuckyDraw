import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react';
import { fill, metal } from '../../shared/format';
import { randomChar } from '../../shared/rng';
import type { ReelsStyle } from '../../types';

export interface ReelRowHandle {
  /** Spins every reel and resolves when the last (right-most) one has stopped on `code`. */
  spin: (code: string, totalSeconds: number) => Promise<void>;
}

interface CharReelHandle {
  spin: (target: string, durationMs: number) => Promise<void>;
}

/** Characters scrolled past per second while a reel is at full speed. */
const CHARS_PER_SECOND = 22;
/** The first reel stops at this share of the total time; the rest stop evenly after it. */
const FIRST_STOP = 0.35;

const CharReel = forwardRef<CharReelHandle, { char: string; cellHeight: number; charset: string }>(
  function CharReel({ char, cellHeight, charset }, ref) {
    const stripRef = useRef<HTMLDivElement>(null);
    const spinningRef = useRef(false);
    const shownRef = useRef(char);

    const setStatic = (c: string) => {
      const strip = stripRef.current;
      if (!strip) return;
      strip.getAnimations().forEach((a) => a.cancel());
      strip.classList.remove('spinning');
      strip.replaceChildren(cell(c));
      shownRef.current = c;
    };

    const cell = (c: string) => {
      const span = document.createElement('span');
      span.className = 'reel-cell';
      span.style.height = `${cellHeight}px`;
      span.textContent = c;
      return span;
    };

    useEffect(() => {
      if (!spinningRef.current) setStatic(char);
    }, [char, cellHeight]);

    useImperativeHandle(ref, () => ({
      spin: (target, durationMs) =>
        new Promise<void>((resolve) => {
          const strip = stripRef.current;
          if (!strip) return resolve();
          spinningRef.current = true;
          const steps = Math.max(6, Math.round((durationMs / 1000) * CHARS_PER_SECOND));
          const cells = [cell(shownRef.current)];
          for (let i = 0; i < steps - 1; i++) cells.push(cell(randomChar(charset)));
          cells.push(cell(target));
          // One extra cell below the target so the overshoot of the easing has something to show.
          cells.push(cell(randomChar(charset)));
          strip.getAnimations().forEach((a) => a.cancel());
          strip.replaceChildren(...cells);
          strip.classList.add('spinning');

          const anim = strip.animate(
            [{ transform: 'translateY(0)' }, { transform: `translateY(${-steps * cellHeight}px)` }],
            { duration: durationMs, easing: 'cubic-bezier(0.15, 0.55, 0.2, 1.06)', fill: 'forwards' },
          );
          const unblur = setTimeout(() => strip.classList.remove('spinning'), durationMs * 0.82);
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            clearTimeout(unblur);
            clearTimeout(fallback);
            spinningRef.current = false;
            setStatic(target);
            resolve();
          };
          // Animation events only fire on rendered frames; a hidden or minimised window must not stall the draw.
          const fallback = setTimeout(settle, durationMs + 80);
          anim.onfinish = settle;
          anim.oncancel = settle;
        }),
    }));

    return (
      <div className="reel-window">
        <div ref={stripRef} className="reel-strip" />
      </div>
    );
  },
);

export const ReelRow = forwardRef<
  ReelRowHandle,
  { width: number; height: number; count: number; code: string | null; charset: string; style: ReelsStyle }
>(function ReelRow({ width, height, count, code, charset, style }, ref) {
  const reels = useRef<(CharReelHandle | null)[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);

  const boxW = Math.max(4, (width - style.gap * (count - 1)) / count);
  const fontSize = Math.min(height, boxW * 1.3) * style.fontScale;
  const chars = code ? [...code] : [];

  useImperativeHandle(ref, () => ({
    spin: async (target, totalSeconds) => {
      const targetChars = [...target];
      const total = totalSeconds * 1000;
      await Promise.all(
        reels.current.slice(0, count).map((r, i) => {
          const share = count > 1 ? FIRST_STOP + ((1 - FIRST_STOP) * i) / (count - 1) : 1;
          return r?.spin(targetChars[i] ?? '', total * share);
        }),
      );
      const row = rowRef.current;
      if (row) {
        row.classList.remove('reels-win');
        void row.offsetWidth; // restart the CSS animation
        row.classList.add('reels-win');
      }
    },
  }));

  const bw = style.borderWidth;
  return (
    <div ref={rowRef} className="reels" style={{ gap: style.gap }}>
      {Array.from({ length: count }, (_, i) => (
        // Two nested shells: the outer one is the (metallic) rim, the inner one the face.
        <div
          key={i}
          className={style.shadow ? 'reel-box reel-box-shadow' : 'reel-box'}
          style={
            {
              width: boxW,
              height,
              padding: bw,
              borderRadius: style.radius,
              background: bw ? metal(style.borderColor, style.borderColor2) : 'transparent',
              '--i': i,
            } as CSSProperties
          }
        >
          <div
            className="reel-inner"
            style={{
              borderRadius: Math.max(0, style.radius - bw),
              background: fill(style.bg, style.bg2),
              color: style.color,
              fontFamily: style.font,
              fontSize,
              textShadow: style.glow ? `0 0 0.3em ${style.glow}, 0 0 0.08em ${style.glow}` : undefined,
            }}
          >
            <CharReel
              ref={(r) => {
                reels.current[i] = r;
              }}
              char={chars[i] ?? style.idleChar}
              cellHeight={height - bw * 2}
              charset={charset}
            />
            <span className="reel-shine" />
          </div>
        </div>
      ))}
    </div>
  );
});
