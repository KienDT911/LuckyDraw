import type { Prize, Winner } from '../../types';

const SAMPLE_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Châu',
  'Phạm Quốc Dũng',
  'Hoàng Thu Hà',
  'Võ Gia Huy',
  'Đặng Ngọc Lan',
  'Bùi Thanh Long',
  'Đỗ Kim Mai',
  'Hồ Đức Nam',
  'Ngô Bảo Ngọc',
  'Dương Hữu Phúc',
];

/** Deterministic codes, so previews do not flicker between renders. */
export function sampleCode(i: number, length: number, charset: string): string {
  const chars = charset || '0123456789';
  let x = Math.imul(i + 1, 2654435761) >>> 0;
  let out = '';
  for (let k = 0; k < length; k++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    out += chars[(x >>> 8) % chars.length];
  }
  return out;
}

/** Placeholder winners (one per slot, capped) so a layout can be judged before any draw. */
export function sampleWinners(prizes: Prize[], codeLength: number, charset: string, perPrizeCap = 30): Winner[] {
  const winners: Winner[] = [];
  let n = 0;
  for (const p of prizes) {
    for (let seq = 1; seq <= Math.min(p.slots, perPrizeCap); seq++, n++) {
      winners.push({
        id: -(n + 1),
        prizeId: p.id,
        seq,
        name: SAMPLE_NAMES[n % SAMPLE_NAMES.length],
        phone: `09${String(10000000 + ((n * 7919) % 89999999)).padStart(8, '0')}`,
        code: sampleCode(n, codeLength, charset),
        key: `sample:${n}`,
        drawnAt: 0,
      });
    }
  }
  return winners;
}
