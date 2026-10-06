import { normalizePhone } from '../../shared/format';
import type { Customer } from '../../types';
import type { CellValue, ParsedSheet } from './parse';

export interface ImportReport {
  total: number;
  imported: number;
  duplicates: number;
  invalid: number;
  alreadyWon: number;
  /** `row` is the row number as shown in Excel. */
  invalidRows: { row: number; code: string }[];
}

function cellText(v: CellValue | undefined): string {
  if (v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toFixed(0) : String(v);
  return v;
}

/** Excel stores long numeric codes as numbers and drops leading zeros; put them back. */
function codeText(v: CellValue | undefined, codeLength: number): string {
  const s = cellText(v).replace(/\s+/g, '');
  return typeof v === 'number' && /^\d+$/.test(s) && s.length < codeLength ? s.padStart(codeLength, '0') : s;
}

/**
 * Turns the rows of the customer file (A = code, B = name, C = phone) into the draw pool.
 * Codes must be exactly `codeLength` digits; repeated codes keep their first row; customers who already won
 * (same phone, or same code) are left out.
 */
export function buildCustomers(
  sheet: ParsedSheet,
  codeLength: number,
  wonKeys: Set<string>,
  wonCodes: Set<string>,
): { customers: Customer[]; report: ImportReport } {
  const report: ImportReport = { total: 0, imported: 0, duplicates: 0, invalid: 0, alreadyWon: 0, invalidRows: [] };
  const validCode = new RegExp(`^\\d{${codeLength}}$`);
  const firstRow = sheet.header ? 2 : 1;
  const seenCodes = new Set<string>();
  const customers: Customer[] = [];

  sheet.rows.forEach((cells, i) => {
    report.total++;
    const code = codeText(cells[0], codeLength);
    if (!validCode.test(code)) {
      report.invalid++;
      report.invalidRows.push({ row: i + firstRow, code });
      return;
    }
    if (seenCodes.has(code)) {
      report.duplicates++;
      return;
    }
    seenCodes.add(code);

    const phone = normalizePhone(cellText(cells[2]));
    const key = phone || `code:${code}`;
    if (wonKeys.has(key) || wonCodes.has(code)) {
      report.alreadyWon++;
      return;
    }
    customers.push({ code, name: cellText(cells[1]).trim(), phone, key });
  });

  report.imported = customers.length;
  return { customers, report };
}
