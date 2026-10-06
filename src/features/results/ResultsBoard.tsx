import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { fill, maskPhone, metal } from '../../shared/format';
import { useT } from '../../shared/i18n';
import { useFontsVersion } from '../../shared/useFontsVersion';
import type { BoardStyle, PhoneMask, Prize, Winner } from '../../types';

const MIN_FIT = 0.25;
const MAX_FIT = 2;

/**
 * Finds the largest font scale at which the content fits the board's height,
 * so 1 winner or 60 winners both fill the board nicely.
 */
function useAutoFit(layoutKey: string) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const fontsVersion = useFontsVersion();

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const cs = getComputedStyle(outer);
    const availH = outer.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const availW = outer.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const fits = (k: number) => {
      inner.style.setProperty('--fit', String(k));
      return inner.scrollHeight <= availH + 1 && inner.scrollWidth <= availW + 1;
    };
    let lo = MIN_FIT;
    let hi = MAX_FIT;
    if (fits(hi)) lo = hi;
    else {
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
    }
    inner.style.setProperty('--fit', String(lo));
    setFit(lo);
  }, [layoutKey, fontsVersion]);

  return { outerRef, innerRef, fit };
}

export function ResultsBoard({
  prizes,
  winners,
  style,
  mask,
  width,
  height,
}: {
  prizes: Prize[];
  winners: Winner[];
  style: BoardStyle;
  mask: PhoneMask;
  width: number;
  height: number;
}) {
  const t = useT();
  const byPrize = new Map<string, Winner[]>();
  for (const w of winners) {
    const list = byPrize.get(w.prizeId) ?? [];
    list.push(w);
    byPrize.set(w.prizeId, list);
  }
  for (const list of byPrize.values()) list.sort((a, b) => a.seq - b.seq);

  const sections = prizes.filter((p) => !style.hideEmpty || (byPrize.get(p.id)?.length ?? 0) > 0);
  const layoutKey = [
    sections.map((p) => `${p.id}:${p.name}:${p.description}`).join('|'),
    winners.map((w) => w.id).join(','),
    JSON.stringify(style),
    mask,
    width,
    height,
  ].join('#');
  const { outerRef, innerRef, fit } = useAutoFit(layoutKey);

  const line = (w: Winner) =>
    [style.showName && w.name, style.showPhone && maskPhone(w.phone, mask), style.showCode && w.code]
      .filter(Boolean)
      .join(' – ');

  const twoCol = style.columns === 2 && sections.length > 1;
  // Top prize spans the full width; an odd last prize does too (like the reference boards).
  const spanFull = (i: number) => !twoCol || i === 0 || (i === sections.length - 1 && (sections.length - 1) % 2 === 1);

  return (
    <div
      ref={outerRef}
      className={style.ornament ? 'board board-ornate' : 'board'}
      style={
        {
          background: fill(style.bg, style.bg2),
          border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor}` : 'none',
          borderRadius: style.radius,
          padding: style.padding,
          fontFamily: style.font,
          color: style.textColor,
          '--line': style.borderWidth ? style.borderColor : style.labelBg,
          '--frame-radius': `${Math.max(0, style.radius - 12)}px`,
        } as CSSProperties
      }
    >
      <div
        ref={innerRef}
        className={twoCol ? 'board-inner board-2col' : 'board-inner'}
        style={{ ['--fit' as string]: fit, ['--base' as string]: `${style.baseFontSize}px` }}
      >
        {sections.map((p, i) => {
          const list = byPrize.get(p.id) ?? [];
          return (
            <section key={p.id} className={spanFull(i) ? 'board-sec board-sec-full' : 'board-sec'}>
              <div className="board-label-row">
                <div
                  className="board-label"
                  style={{ background: metal(style.labelBg, style.labelBg2, 175), color: style.labelColor, fontFamily: style.labelFont }}
                >
                  {p.name}
                </div>
              </div>
              {p.description && (
                <div className="board-desc" style={{ color: style.descColor, fontFamily: style.labelFont }}>
                  {p.description}
                </div>
              )}
              <div className="board-winners">
                {list.length ? (
                  list.map((w) => (
                    <span key={w.id ?? w.code} className="board-winner">
                      {line(w)}
                    </span>
                  ))
                ) : (
                  <span className="board-empty">{t('notDrawn')}</span>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
