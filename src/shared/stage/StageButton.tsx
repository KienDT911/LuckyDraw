import type { CSSProperties } from 'react';
import type { ButtonStyle } from '../../types';
import { metal } from '../format';

export function StageButton({
  style,
  fallbackLabel,
  onClick,
  disabled,
}: {
  style: ButtonStyle;
  fallbackLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="stage-button-wrap">
      {/* The halo sits outside the button so the button itself can clip its hover shine. */}
      {style.glow && <span className="stage-button-halo" style={{ background: style.glow, borderRadius: style.radius }} />}
      <button
        type="button"
        className="stage-button"
        disabled={disabled}
        onClick={onClick}
        style={
          {
            background: style.bg2 ? metal(style.bg, style.bg2, 175) : style.bg,
            color: style.color,
            border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor}` : 'none',
            borderRadius: style.radius,
            fontFamily: style.font,
            fontSize: style.fontSize,
            letterSpacing: style.letterSpacing,
            paddingLeft: style.letterSpacing,
          } as CSSProperties
        }
      >
        <span className="stage-button-label">{style.label || fallbackLabel}</span>
      </button>
    </div>
  );
}
