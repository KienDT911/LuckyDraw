import { db, loadCampaign } from '../../shared/db';
import { dateStamp, downloadBlob, safeFileName } from '../../shared/format';
import { flushSave } from '../../shared/store';
import type { Campaign, Customer, Winner } from '../../types';

const APP_ID = 'fmv-luckydraw';
const VERSION = 1;

interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  campaign: Campaign;
  customers: Customer[];
  winners: Winner[];
  assets: { id: string; name: string; mime: string; dataUrl: string }[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function saveBackupFile(): Promise<void> {
  await flushSave();
  const campaign = await loadCampaign();
  if (!campaign) return;
  const file: BackupFile = {
    app: APP_ID,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    campaign,
    customers: await db.customers.toArray(),
    winners: await db.winners.toArray(),
    assets: await Promise.all(
      (await db.assets.toArray()).map(async (a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        dataUrl: await blobToDataUrl(a.blob),
      })),
    ),
  };
  downloadBlob(
    new Blob([JSON.stringify(file)], { type: 'application/json' }),
    `${safeFileName(campaign.name)}_backup_${dateStamp()}.luckydraw.json`,
  );
}

export async function readBackupFile(f: File): Promise<BackupFile | null> {
  try {
    const data = JSON.parse(await f.text()) as Partial<BackupFile>;
    if (data.app !== APP_ID || !data.campaign || !Array.isArray(data.customers) || !Array.isArray(data.winners)) {
      return null;
    }
    return { ...data, assets: data.assets ?? [] } as BackupFile;
  } catch {
    return null;
  }
}

export async function restoreBackup(file: BackupFile): Promise<void> {
  // Write any pending edit of the old campaign now, so it cannot land on top of the restore.
  await flushSave();
  const assets = await Promise.all(
    file.assets.map(async (a) => ({ id: a.id, name: a.name, mime: a.mime, blob: await (await fetch(a.dataUrl)).blob() })),
  );
  await db.transaction('rw', [db.meta, db.customers, db.winners, db.assets], async () => {
    await Promise.all([db.meta.clear(), db.customers.clear(), db.winners.clear(), db.assets.clear()]);
    await db.meta.put({ id: 'campaign', value: file.campaign });
    await db.customers.bulkAdd(file.customers);
    await db.winners.bulkAdd(file.winners);
    await db.assets.bulkAdd(assets);
  });
}
