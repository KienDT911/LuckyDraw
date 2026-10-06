import Papa from 'papaparse';
import { db } from '../../shared/db';
import { dateStamp, downloadBlob, safeFileName } from '../../shared/format';
import { t } from '../../shared/i18n';
import type { Campaign, Winner } from '../../types';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * The customer file as it is now: same layout as the imported file (A = code, B = name, C = phone, plus its
 * header row if it had one), without every customer who has won — so it can be exported and imported again.
 */
async function remainingTable(c: Campaign): Promise<string[][]> {
  const customers = await db.customers.orderBy(':id').toArray();
  const rows = customers.map((cu) => [cu.code, cu.name, cu.phone]);
  const header = c.headerRow.length ? [0, 1, 2].map((i) => c.headerRow[i] ?? '') : null;
  return header ? [header, ...rows] : rows;
}

async function writeXlsx(table: (string | number)[][], sheetName: string, widths: number[], fileName: string) {
  const XLSX = await import('xlsx');
  // Strings become text cells: Excel keeps all 13 digits of a code and the leading 0 of a phone.
  const ws = XLSX.utils.aoa_to_sheet(table);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer;
  downloadBlob(new Blob([out], { type: XLSX_TYPE }), fileName);
}

export async function downloadRemainingXlsx(c: Campaign): Promise<void> {
  await writeXlsx(await remainingTable(c), 'Customers', [18, 30, 16], `${safeFileName(c.name)}_remaining_${dateStamp()}.xlsx`);
}

export async function downloadRemainingCsv(c: Campaign): Promise<void> {
  const csv = Papa.unparse(await remainingTable(c));
  // BOM so Excel opens Vietnamese text as UTF-8.
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${safeFileName(c.name)}_remaining_${dateStamp()}.csv`);
}

/** Winners in the same A/B/C order as the customer file, followed by the prize details. */
export async function downloadWinnersXlsx(c: Campaign, winners: Winner[]): Promise<void> {
  const order = new Map(c.prizes.map((p, i) => [p.id, i]));
  const prizeName = new Map(c.prizes.map((p) => [p.id, p.name]));
  const prizeDesc = new Map(c.prizes.map((p) => [p.id, p.description]));
  const header = [t('colCode'), t('colName'), t('colPhone'), t('prizeName'), t('prizeDesc'), t('colOrder'), t('colDrawnAt')];
  const rows = [...winners]
    .sort((a, b) => (order.get(a.prizeId) ?? 99) - (order.get(b.prizeId) ?? 99) || a.seq - b.seq)
    .map((w) => [
      w.code,
      w.name,
      w.phone,
      prizeName.get(w.prizeId) ?? w.prizeId,
      prizeDesc.get(w.prizeId) ?? '',
      w.seq,
      new Date(w.drawnAt).toLocaleString(),
    ]);
  await writeXlsx([header, ...rows], 'Winners', [18, 30, 16, 18, 30, 6, 22], `${safeFileName(c.name)}_winners_${dateStamp()}.xlsx`);
}
