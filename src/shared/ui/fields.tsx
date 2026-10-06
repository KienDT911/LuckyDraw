import { useEffect, useState, type ReactNode } from 'react';

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'field field-wide' : 'field'}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/** Commits on blur/Enter so typing "1" on the way to "120" does not thrash the layout. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(roundForDisplay(value))), [value]);

  const commit = () => {
    let v = Number(text.replace(',', '.'));
    if (!Number.isFinite(v)) return setText(String(roundForDisplay(value)));
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    if (v !== value) onChange(v);
    else setText(String(roundForDisplay(value)));
  };

  return (
    <input
      className={className ?? 'input input-num'}
      type="number"
      value={text}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        setText(e.target.value);
        // Spinner arrows produce a valid value immediately: apply it live.
        const native = e.nativeEvent as InputEvent;
        if (!native.inputType) {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }
      }}
      onBlur={commit}
      // A focused number field would otherwise change its value when the page is scrolled over it.
      onWheel={(e) => e.currentTarget.blur()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        e.stopPropagation();
      }}
    />
  );
}

function roundForDisplay(v: number): number {
  return Math.round(v * 100) / 100;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return multiline ? (
    <textarea
      className="input"
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.stopPropagation()}
    />
  ) : (
    <input
      className="input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="input"
      value={String(value)}
      onChange={(e) => {
        const opt = options.find((o) => String(o.value) === e.target.value);
        if (opt) onChange(opt.value);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}

/** A colour that can be switched off; off is stored as ''. */
export function OptionalColorInput({
  value,
  onChange,
  fallback = '#d4af37',
}: {
  value: string;
  onChange: (v: string) => void;
  fallback?: string;
}) {
  return (
    <div className="opt-color">
      <Toggle label="" checked={Boolean(value)} onChange={(on) => onChange(on ? fallback : '')} />
      {value && <ColorInput value={value} onChange={onChange} />}
    </div>
  );
}

/** Colour stored as #rrggbb or #rrggbbaa; the slider edits the alpha byte. */
export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? value : '#000000';
  const rgb = hex.slice(0, 7);
  const alpha = hex.length === 9 ? parseInt(hex.slice(7), 16) : 255;
  const withAlpha = (c: string, a: number) => (a >= 255 ? c : c + Math.round(a).toString(16).padStart(2, '0'));

  return (
    <div className="color-input">
      <input type="color" value={rgb} onChange={(e) => onChange(withAlpha(e.target.value, alpha))} />
      <input
        type="range"
        min={0}
        max={255}
        value={alpha}
        title={`${Math.round((alpha / 255) * 100)}%`}
        onChange={(e) => onChange(withAlpha(rgb, Number(e.target.value)))}
      />
      <span className="color-alpha">{Math.round((alpha / 255) * 100)}%</span>
    </div>
  );
}
