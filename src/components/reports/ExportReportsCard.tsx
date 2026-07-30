import { FileSpreadsheet, FileText } from 'lucide-react'

interface ExportReportsCardProps {
  onExportCsv: () => void
  isExportingCsv: boolean
  csvError: string | null
}

const UNAVAILABLE_TITLE = 'Acest format de export nu este încă implementat'

/**
 * figura5's 4-card export section. Only "Raport detaliat comenzi (CSV)" has
 * a real backend today (the existing generate-report edge function, CSV
 * only via papaparse) — brief §10.5 explicitly marks PDF as "opțional în
 * MVP" and doesn't mention Excel at all, so those 3 render disabled with a
 * tooltip, same pattern as SentOrdersPage's AscendTMS/PDF buttons.
 */
export function ExportReportsCard({ onExportCsv, isExportingCsv, csvError }: ExportReportsCardProps) {
  return (
    <div className="reports-export">
      <p className="reports-export__subtitle">Generează și descarcă rapoarte personalizate.</p>
      <div className="reports-export__grid">
        <button type="button" className="reports-export__btn" disabled title={UNAVAILABLE_TITLE}>
          <FileText aria-hidden="true" size={14} />
          Raport general (PDF)
        </button>
        <button type="button" className="reports-export__btn" disabled title={UNAVAILABLE_TITLE}>
          <FileSpreadsheet aria-hidden="true" size={14} className="reports-export__icon--excel" />
          Raport performanță (Excel)
        </button>
        <button type="button" className="reports-export__btn" disabled title={UNAVAILABLE_TITLE}>
          <FileSpreadsheet aria-hidden="true" size={14} className="reports-export__icon--excel" />
          Raport clienți (Excel)
        </button>
        <button
          type="button"
          className="reports-export__btn"
          disabled={isExportingCsv}
          onClick={onExportCsv}
          title="Exportă comenzile din perioada selectată ca CSV"
        >
          <FileSpreadsheet aria-hidden="true" size={14} className="reports-export__icon--excel" />
          {isExportingCsv ? 'Se exportă...' : 'Raport detaliat comenzi (CSV)'}
        </button>
      </div>
      {csvError && (
        <p className="reports-export__error" role="alert">
          {csvError}
        </p>
      )}
    </div>
  )
}
