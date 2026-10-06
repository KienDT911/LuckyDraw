import Papa from 'papaparse';

export type CellValue = string | number;

/**
 * The customer file has a fixed layout: column A = code (13 digits), B = name, C = phone.
 * A header row is optional and recognised automatically.
 */
export interface ParsedSheet {
  fileName: string;
  /** Texts of the first row when it is a header (its column A holds no digits); null when data starts on row 1. */
  header: string[] | null;
  /** Data rows, cells by position (A = 0). Numbers only come from numeric Excel cells. */
  rows: CellValue[][];
}

function decodeText(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // Legacy Vietnamese Windows encoding.
    return new TextDecoder('windows-1258').decode(buf);
  }
}

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function cell(v: unknown): CellValue {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return formatDate(v);
  return String(v ?? '').trim();
}

function finish(fileName: string, matrix: unknown[][]): ParsedSheet {
  const rows = matrix
    .map((r) => (Array.isArray(r) ? r.map(cell) : []))
    .filter((r) => r.some((c) => c !== ''));
  // A real code always contains digits; a first row whose column A has none ("Mã dự thưởng", "Code") is a header.
  const first = rows[0];
  if (first && !/\d/.test(String(first[0] ?? ''))) {
    return { fileName, header: first.map((c) => String(c)), rows: rows.slice(1) };
  }
  return { fileName, header: null, rows };
}

async function parseCsv(file: File): Promise<ParsedSheet> {
  const text = decodeText(await file.arrayBuffer()).replace(/^﻿/, '');
  // Delimiter (comma, semicolon, tab) is detected automatically.
  const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
  return finish(file.name, result.data);
}

async function parseExcel(file: File): Promise<ParsedSheet> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { fileName: file.name, header: null, rows: [] };
  return finish(file.name, XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '', blankrows: false }));
}

export async function parseFile(file: File): Promise<ParsedSheet> {
  return /\.csv$|\.txt$/i.test(file.name) ? parseCsv(file) : parseExcel(file);
}
