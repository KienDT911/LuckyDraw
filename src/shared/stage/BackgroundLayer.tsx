import { memo, type CSSProperties } from 'react';
import type { Background, Decor } from '../../types';
import { withAlpha } from '../format';
import { useCampaign } from '../store';

export function BackgroundLayer({ bg, onPointerDown }: { bg: Background; onPointerDown?: () => void }) {
  const url = useCampaign((s) => (bg.imageId ? s.assetUrls[bg.imageId] : undefined));
  const base = bg.color2 ? `linear-gradient(180deg, ${bg.color} 0%, ${bg.color2} 100%)` : bg.color;
  const size = bg.fit === 'fill' ? '100% 100%' : bg.fit;

  return (
    <div className="layer layer-bg" style={{ background: base }} onPointerDown={onPointerDown}>
      {url && <div className="layer-bg-image" style={{ backgroundImage: `url("${url}")`, backgroundSize: size }} />}
      <DecorLayer kind={bg.decor} color={bg.decorColor} />
      {bg.frame && (
        <div className="bg-frame" style={{ '--frame': bg.decorColor } as CSSProperties}>
          <span className="bg-frame-corner tl" />
          <span className="bg-frame-corner tr" />
          <span className="bg-frame-corner bl" />
          <span className="bg-frame-corner br" />
        </div>
      )}
    </div>
  );
}

/** Small deterministic PRNG so the sparkle field is identical on every render and export. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPARKS = (() => {
  const rnd = mulberry32(20261006);
  return Array.from({ length: 110 }, (_, i) => ({
    x: rnd() * 1920,
    y: rnd() * 1080,
    r: 0.6 + rnd() * rnd() * 2.6,
    o: 0.25 + rnd() * 0.6,
    glint: i % 13 === 0,
    twinkle: i % 4 === 0,
    delay: rnd() * 6,
  }));
})();

const DECO_RAYS = Array.from({ length: 33 }, (_, i) => {
  const a = ((-80 + i * 5) * Math.PI) / 180;
  return { x: 960 + Math.sin(a) * 1700, y: 1240 - Math.cos(a) * 1700 };
});

const DecorLayer = memo(function DecorLayer({ kind, color }: { kind: Decor; color: string }) {
  switch (kind) {
    case 'none':
      return null;
    case 'spotlight':
      return (
        <div
          className="decor decor-spotlight"
          style={{
            background: `radial-gradient(ellipse 58% 52% at 50% 36%, ${withAlpha(color, 0.3)} 0%, ${withAlpha(color, 0.1)} 38%, transparent 70%)`,
          }}
        />
      );
    case 'sparkle':
      return (
        <>
          <div
            className="decor decor-spotlight"
            style={{ background: `radial-gradient(ellipse 55% 50% at 50% 40%, ${withAlpha(color, 0.16)} 0%, transparent 70%)` }}
          />
          {/* Still sparks: one static SVG, painted once. */}
          <svg className="decor" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
            {SPARKS.filter((s) => !s.twinkle).map((s, i) =>
              s.glint ? (
                <path
                  key={i}
                  d={`M${s.x} ${s.y - 9}L${s.x + 1.6} ${s.y - 1.6}L${s.x + 9} ${s.y}L${s.x + 1.6} ${s.y + 1.6}L${s.x} ${s.y + 9}L${s.x - 1.6} ${s.y + 1.6}L${s.x - 9} ${s.y}L${s.x - 1.6} ${s.y - 1.6}Z`}
                  fill={color}
                  opacity={s.o}
                />
              ) : (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={color} opacity={s.o} />
              ),
            )}
          </svg>
          {/* Twinkling sparks: separate small layers animated with transform/opacity only (no repaints). */}
          <div className="decor">
            {SPARKS.filter((s) => s.twinkle).map((s, i) => (
              <span
                key={i}
                className={s.glint ? 'spark spark-glint' : 'spark'}
                style={{
                  left: `${(s.x / 1920) * 100}%`,
                  top: `${(s.y / 1080) * 100}%`,
                  width: s.glint ? 20 : s.r * 2.4,
                  height: s.glint ? 20 : s.r * 2.4,
                  background: color,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>
        </>
      );
    case 'rays':
      return (
        <>
          <div className="decor decor-rays-wrap">
            <div
              className="decor-rays"
              style={{
                background: `repeating-conic-gradient(from 0deg, ${withAlpha(color, 0.13)} 0deg 5deg, transparent 5deg 15deg)`,
              }}
            />
          </div>
          <div
            className="decor decor-spotlight"
            style={{ background: `radial-gradient(circle at 50% 50%, ${withAlpha(color, 0.18)} 0%, transparent 45%)` }}
          />
        </>
      );
    case 'deco':
      return (
        <svg className="decor" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
          <g stroke={color} fill="none" opacity={0.22}>
            {DECO_RAYS.map((p, i) => (
              <line key={i} x1={960} y1={1240} x2={p.x} y2={p.y} strokeWidth={1.2} />
            ))}
            {[420, 470, 760, 790].map((r) => (
              <circle key={r} cx={960} cy={1240} r={r} strokeWidth={r % 2 ? 1 : 1.6} />
            ))}
          </g>
          <g stroke={color} fill="none" opacity={0.35} strokeWidth={1.2}>
            {[
              [0, 0, 1],
              [1920, 0, 1],
              [0, 1080, -1],
              [1920, 1080, -1],
            ].map(([cx, cy], i) =>
              [110, 150, 190].map((r) => <circle key={`${i}-${r}`} cx={cx} cy={cy} r={r} />),
            )}
          </g>
        </svg>
      );
  }
});
