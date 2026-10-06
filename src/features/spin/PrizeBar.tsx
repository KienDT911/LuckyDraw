import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { metal } from '../../shared/format';
import { useFontsVersion } from '../../shared/useFontsVersion';
import type { PrizeBarStyle } from '../../types';

export function PrizeBar({
  label,
  codes,
  drawn,
  slots,
  style,
}: {
  label: string;
  codes: string[];
  drawn: number;
  slots: number;
  style: PrizeBarStyle;
}) {
  const visible = codes.slice(-Math.max(1, style.maxVisible));
  const inset = 6;
  const codesRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const fontsVersion = useFontsVersion();
  const fitKey = `${visible.join(',')}|${style.fontSize}|${style.font}|${style.letterSpacing}|${label}`;

  // Shrink the code strip just enough to show every visible code in full.
  useLayoutEffect(() => {
    const el = codesRef.current;
    if (!el) return;
    let k = 1;
    el.style.setProperty('--codes-fit', '1');
    for (let i = 0; i < 12 && el.scrollWidth > el.clientWidth + 1 && k > 0.5; i++) {
      k *= Math.max(0.5, (el.clientWidth / el.scrollWidth) * 0.98);
      el.style.setProperty('--codes-fit', String(k));
    }
    setFit(k);
  }, [fitKey, fontsVersion]);
  return (
    <div
      className="prize-bar"
      style={
        {
          background: style.bg,
          color: style.color,
          border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor}` : 'none',
          borderRadius: style.radius,
          fontFamily: style.font,
          fontSize: style.fontSize,
          letterSpacing: style.letterSpacing,
          '--inset': `${inset}px`,
          '--accent': style.labelBg,
        } as CSSProperties
      }
    >
      <div
        className="prize-bar-label"
        style={{
          background: metal(style.labelBg, style.labelBg2, 175),
          color: style.labelColor,
          fontFamily: style.labelFont,
          borderRadius: Math.max(0, style.radius - inset),
        }}
      >
        {label}
      </div>
      <div ref={codesRef} className="prize-bar-codes" style={{ '--codes-fit': fit } as CSSProperties}>
        {visible.map((c, i) => (
          <Fragment key={`${c}-${i}`}>
            {i > 0 && <span className="prize-bar-sep" />}
            <span className="prize-bar-code">{c}</span>
          </Fragment>
        ))}
      </div>
      {style.showCount && slots > 0 && (
        <div className="prize-bar-count">
          <b>{drawn}</b>
          <span>/{slots}</span>
        </div>
      )}
    </div>
  );
}
