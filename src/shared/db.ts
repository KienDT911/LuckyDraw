import Dexie, { type Table } from 'dexie';
import type { Asset, Campaign, Customer, Winner } from '../types';

/** Which cloud version of the shared design this browser last saved or loaded. */
export interface SyncMeta {
  version: number;
  /** The shared design (JSON) as it was at that version, to tell whether there are unsaved edits. */
  json: string;
}

type MetaRow = { id: 'campaign'; value: Campaign } | { id: 'sync'; value: SyncMeta };

class LuckyDrawDB extends Dexie {
  meta!: Table<MetaRow, string>;
  customers!: Table<Customer, number>;
  winners!: Table<Winner, number>;
  assets!: Table<Asset, string>;

  constructor() {
    // Unique name: several apps on one domain share the same browser storage origin.
    super('fmv-luckydraw');
    this.version(1).stores({
      meta: 'id',
      customers: '++id, &code, key',
      winners: '++id, prizeId, key, code',
      assets: 'id',
    });
  }
}

export const db = new LuckyDrawDB();

export async function loadCampaign(): Promise<Campaign | undefined> {
  return (await db.meta.get('campaign'))?.value as Campaign | undefined;
}

export async function loadSyncMeta(): Promise<SyncMeta | undefined> {
  return (await db.meta.get('sync'))?.value as SyncMeta | undefined;
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  await db.meta.put({ id: 'sync', value: meta });
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  await db.meta.put({ id: 'campaign', value: campaign });
}

/** Ask the browser not to evict our storage under disk pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
