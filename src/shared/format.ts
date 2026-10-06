import type { PhoneMask } from '../types';

export function maskPhone(phone: string, mode: PhoneMask): string {
  if (mode === 'none' || phone.length <= 4) return phone;
  const head = phone.slice(0, -4);
  const tail = phone.slice(-4);
  return mode === 'showLast4' ? 'x'.repeat(head.length) + tail : head + 'xxxx';
}

/** Digits only; restores the leading 0 Excel drops from Vietnamese mobile numbers. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 9 && !digits.startsWith('0') ? '0' + digits : digits;
}

/** `#rrggbb[aa]` → same colour at opacity `a` (0–1). Other formats are returned unchanged. */
export function withAlpha(color: string, a: number): string {
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)) return color;
  return color.slice(0, 7) + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}

/** Solid colour, or a vertical gradient when a second colour is set. */
export function fill(color: string, color2: string, angle = 180): string {
  return color2 ? `linear-gradient(${angle}deg, ${color} 0%, ${color2} 100%)` : color;
}

/** Polished-metal gradient (light → dark → light), for borders and lettering. */
export function metal(color: string, color2: string, angle = 165): string {
  return color2 ? `linear-gradient(${angle}deg, ${color} 8%, ${color2} 48%, ${color} 78%, ${color2} 100%)` : color;
}

export function safeFileName(name: string): string {
  return (name.trim() || 'campaign').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);
}

export function dateStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
