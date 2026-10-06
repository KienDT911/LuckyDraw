import { useMemo, useState } from 'react';
import { db } from '../../shared/db';
import { useT } from '../../shared/i18n';
import { useCampaign } from '../../shared/store';
import type { ParsedSheet } from '../import/parse';
import { buildCustomers, cleanRow, type ImportReport } from '../import/process';

/**
 * Shows what the file contains (A = code, B = name, C = phone) and what will happen, before anything is
 * replaced. Importing replaces the current list; customers who already won stay excluded.
 */
export function ImportDialog({
  sheet,
  onClose,
  onDone,
}: {
  sheet: ParsedSheet;
  onClose: () => void;
  onDone: (report: ImportReport) => void;
}) {
  const t = useT();
  const codeLength = useCampaign((s) => s.campaign.codeLength);
  const winners = useCampaign((s) => s.winners);
  const poolCount = useCampaign((s) => s.poolCount);
  const [busy, setBusy] = useState(false);

  // Worked out up front so the counts are shown before the current list is replaced.
  const { customers, report } = useMemo(
    () =>
      buildCustomers(
        sheet,
        codeLength,
        new Set(winners.map((w) => w.key)),
        new Set(winners.map((w) => w.code)),
      ),
    [sheet, codeLength, winners],
  );
  const preview = sheet.rows.slice(0, 5);
  const firstRow = sheet.header ? 2 : 1;

  const doImport = async () => {
    setBusy(true);
    try {
      await db.transaction('rw', db.customers, async () => {
        await db.customers.clear();
        await db.customers.bulkAdd(customers);
      });
      useCampaign.getState().update((c) => {
        c.headerRow = sheet.header ?? [];
        c.importedFileName = sheet.fileName;
        c.charset = '0123456789';
      });
      await useCampaign.getState().refreshPoolCount();
      onDone(report);
    } finally {
      setBusy(false);
    }
  };

  const counts: [string, number, string?][] = [
    [t('reportImported'), report.imported, 'ok'],
    [t('reportDuplicates'), report.duplicates],
    [t('reportInvalid', { len: codeLength }), report.invalid, report.invalid ? 'bad' : undefined],
    [t('reportAlreadyWon'), report.alreadyWon],
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal-shell modal-lg">
        <div className="modal" role="dialog" aria-modal="true">
          <h3>{t('checkTitle')}</h3>
          <p className="muted">
            {t('checkRows', { n: sheet.rows.length, file: sheet.fileName })}
            {sheet.header && <> · {t('headerDetected', { text: sheet.header.slice(0, 3).join(' | ') })}</>}
          </p>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-letter">#</th>
                  <th>A · {t('colCode')}</th>
                  <th>B · {t('colName')}</th>
                  <th>C · {t('colPhone')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((cells, i) => (
                  <tr key={i}>
                    <td className="col-letter">{i + firstRow}</td>
                    {cleanRow(cells, codeLength).map((v, c) => (
                      <td key={c}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="report">
            {counts.map(([label, n, cls]) => (
              <div key={label} className={cls ? `report-row ${cls}` : 'report-row'}>
                <dt>{label}</dt>
                <dd>{n.toLocaleString()}</dd>
              </div>
            ))}
          </dl>

          {report.invalidRows.length > 0 && (
            <>
              <h4>{t('reportInvalidRows')}</h4>
              <div className="invalid-list">
                {report.invalidRows.slice(0, 200).map((r) => (
                  <div key={r.row}>
                    {t('reportRow', { row: r.row })}: <code>{r.code || '∅'}</code>
                  </div>
                ))}
                {report.invalidRows.length > 200 && <div>… +{report.invalidRows.length - 200}</div>}
              </div>
            </>
          )}

          {poolCount > 0 && <p className="warn">{t('importReplaceWarn')}</p>}

          <div className="modal-actions">
            <button className="btn" onClick={onClose} disabled={busy}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={() => void doImport()} disabled={busy || report.imported === 0}>
              {busy ? t('loading') : t('importN', { n: report.imported.toLocaleString() })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
