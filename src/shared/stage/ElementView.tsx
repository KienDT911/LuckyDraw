import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { SceneElement } from '../../types';
import { metal } from '../format';
import { useCampaign } from '../store';
import { useFontsVersion } from '../useFontsVersion';

export function ElementView({ el }: { el: SceneElement }) {
  switch (el.type) {
    case 'text':
      return <TextView el={el} />;
    case 'image':
      return <ImageView el={el} />;
    case 'shape':
      return <ShapeView el={el} />;
  }
}

/**
 * Largest scale (≤ 1) at which the text fits its box without breaking words, so a long title
 * shrinks instead of spilling over the reels. The configured font size acts as the maximum.
 */
function useFitText(
  boxRef: RefObject<HTMLDivElement | null>,
  key: string,
  fontSize: number,
  letterSpacing: number,
  centred: boolean,
) {
  const [fit, setFit] = useState(1);
  const fontsVersion = useFontsVersion();

  useLayoutEffect(() => {
    const box = boxRef.current;
    const span = box?.firstElementChild as HTMLElement | null;
    if (!box || !span) return;
    // Mirror everything the render scales, so what is measured is what gets drawn.
    const apply = (k: number) => {
      box.style.fontSize = `${fontSize * k}px`;
      box.style.letterSpacing = `${letterSpacing * k}px`;
      span.style.paddingLeft = centred && letterSpacing > 0 ? `${letterSpacing * k}px` : '';
    };
    const fits = (k: number) => {
      apply(k);
      const cs = getComputedStyle(span);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      return span.scrollHeight - padY <= box.clientHeight + 1 && span.scrollWidth <= span.clientWidth + 1;
    };
    let k = 1;
    if (!fits(1)) {
      let lo = 0.2;
      let hi = 1;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      // Small margin: the search lands right on the edge, where sub-pixel rounding can still wrap.
      k = lo * 0.98;
    }
    // Leave the DOM at the result even when React sees no prop change.
    apply(k);
    setFit(k);
  }, [boxRef, key, fontSize, letterSpacing, centred, fontsVersion]);

  return fit;
}

function TextView({ el }: { el: Extract<SceneElement, { type: 'text' }> }) {
  const p = el.props;
  const boxRef = useRef<HTMLDivElement>(null);
  const fitKey = [p.text, p.font, p.fontWeight, p.italic, p.uppercase, p.lineHeight, p.strokeWidth, el.frame.w, el.frame.h].join('|');
  const fit = useFitText(boxRef, fitKey, p.fontSize, p.letterSpacing, p.align === 'center');
  const size = p.fontSize * fit;
  const spacing = p.letterSpacing * fit;

  // drop-shadow (not text-shadow) so shadows stay behind gradient-filled lettering.
  const filters = [
    p.shadow && 'drop-shadow(0 10px 22px rgba(0,0,0,0.45))',
    p.glow && `drop-shadow(0 0 ${Math.max(6, size * 0.12)}px ${p.glow})`,
  ].filter(Boolean);
  const style: CSSProperties = {
    fontFamily: p.font,
    fontSize: size,
    fontWeight: p.fontWeight,
    fontStyle: p.italic ? 'italic' : 'normal',
    textTransform: p.uppercase ? 'uppercase' : 'none',
    textAlign: p.align,
    letterSpacing: spacing,
    lineHeight: p.lineHeight,
    justifyContent: p.align === 'left' ? 'flex-start' : p.align === 'right' ? 'flex-end' : 'center',
    filter: filters.length ? filters.join(' ') : undefined,
  };
  const ink: CSSProperties = p.color2
    ? {
        color: p.color,
        backgroundImage: metal(p.color, p.color2, 180),
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        // A clipped background only paints inside the box; stacked Vietnamese marks (Ắ, Ẩ, Ỗ…) rise above
        // the line box, so extend the painted area without changing the layout.
        paddingBlock: '0.3em',
        marginBlock: '-0.3em',
      }
    : { color: p.color };
  return (
    <div ref={boxRef} className="el-text" style={style}>
      <span
        style={{
          ...ink,
          WebkitTextStroke: p.strokeWidth ? `${p.strokeWidth * fit}px ${p.strokeColor}` : undefined,
          paintOrder: 'stroke fill',
          // Letter-spacing adds trailing space after the last glyph; balance it so centred text stays centred.
          paddingLeft: p.align === 'center' && spacing > 0 ? spacing : undefined,
        }}
      >
        {p.text}
      </span>
    </div>
  );
}

function ImageView({ el }: { el: Extract<SceneElement, { type: 'image' }> }) {
  const url = useCampaign((s) => (el.props.assetId ? s.assetUrls[el.props.assetId] : undefined));
  if (!url) return <div className="el-image-empty" />;
  return (
    <img
      className="el-image"
      src={url}
      alt=""
      draggable={false}
      style={{ objectFit: el.props.fit, borderRadius: el.props.radius }}
    />
  );
}

function ShapeView({ el }: { el: Extract<SceneElement, { type: 'shape' }> }) {
  const p = el.props;
  return (
    <div
      className="el-shape"
      style={{
        background: p.fill,
        border: p.borderWidth ? `${p.borderWidth}px solid ${p.borderColor}` : undefined,
        borderRadius: p.shape === 'ellipse' ? '50%' : p.radius,
      }}
    />
  );
}
