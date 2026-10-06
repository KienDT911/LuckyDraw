/** Unbiased random integer in [0, max) from the platform CSPRNG (rejection sampling). */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 0x1_0000_0000) {
    throw new RangeError(`randomInt: invalid max ${max}`);
  }
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export function randomChar(charset: string): string {
  return charset[Math.floor(Math.random() * charset.length)] ?? '0';
}

export function uid(prefix = ''): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
