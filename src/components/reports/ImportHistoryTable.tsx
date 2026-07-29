import type { DailyPerformanceRow } from '../../lib/reports/aggregations'
import { formatCurrency, formatNumber, formatPercent } from '../../lib/reports/format'

interface ImportHistoryTableProps {
  rows: DailyPerformanceRow[]
}

function formatDayLabel(isoDate: string): string {
  return `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}.${isoDate.slice(0, 4)}`
}

export function ImportHistoryTable({ rows }: ImportHistoryTableProps) {
  if (rows.length === 0) {
    return <p className="reports-history-table__empty">Nicio comandă în perioada selectată.</p>
  }

  return (
    <div className="reports-history-table-wrap">
      <table className="reports-history-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Total comenzi</th>
            <th>Importate</th>
            <th>În așteptare</th>
            <th>Respinse</th>
            <th>Rată import</th>
            <th>Volum (m³)</th>
            <th>Greutate (kg)</th>
            <th>Valoare (EUR)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <td>{formatDayLabel(row.date)}</td>
              <td>{row.total}</td>
              <td>{row.imported}</td>
              <td>{row.pending}</td>
              <td>{row.rejected}</td>
              <td>{row.importRate === null ? '—' : formatPercent(row.importRate, 1)}</td>
              <td>{formatNumber(row.volume)}</td>
              <td>{formatNumber(row.weight)}</td>
              <td>{formatCurrency(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
