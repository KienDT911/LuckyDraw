import { db } from '../../shared/db';
import { randomInt } from '../../shared/rng';
import type { Prize, Winner } from '../../types';

export type DrawResult =
  | { kind: 'winner'; winner: Winner }
  | { kind: 'prizeFull' }
  | { kind: 'poolEmpty' };

/**
 * Picks one winner for `prize` and commits it atomically: the winner row is written and
 * every pool entry of the same customer (same key) is removed in one transaction.
 * The result is final before any animation runs, so a refresh can never change it.
 */
export async function drawOne(prize: Prize): Promise<DrawResult> {
  return db.transaction('rw', db.customers, db.winners, async (): Promise<DrawResult> => {
    const drawn = await db.winners.where('prizeId').equals(prize.id).count();
    if (drawn >= prize.slots) return { kind: 'prizeFull' };

    const poolSize = await db.customers.count();
    if (poolSize === 0) return { kind: 'poolEmpty' };

    const picked = await db.customers.orderBy(':id').offset(randomInt(poolSize)).first();
    if (!picked) return { kind: 'poolEmpty' };

    const winner: Winner = {
      prizeId: prize.id,
      seq: drawn + 1,
      code: picked.code,
      name: picked.name,
      phone: picked.phone,
      key: picked.key,
      drawnAt: Date.now(),
    };
    winner.id = await db.winners.add(winner);
    // One customer can win only one prize: drop all of their entries.
    await db.customers.where('key').equals(picked.key).delete();
    return { kind: 'winner', winner };
  });
}
