interface SummaryTilesProps {
  total: number
  needsValidation: number
  imported: number
}

export function SummaryTiles({ total, needsValidation, imported }: SummaryTilesProps) {
  return (
    <div className="dashboard-tiles">
      <div className="dashboard-tiles__tile">
        <span className="dashboard-tiles__value">{total}</span>
        <span className="dashboard-tiles__label">Total emailuri</span>
      </div>
      <div className="dashboard-tiles__tile dashboard-tiles__tile--warning">
        <span className="dashboard-tiles__value">{needsValidation}</span>
        <span className="dashboard-tiles__label">Necesită validare</span>
      </div>
      <div className="dashboard-tiles__tile dashboard-tiles__tile--success">
        <span className="dashboard-tiles__value">{imported}</span>
        <span className="dashboard-tiles__label">Importate</span>
      </div>
    </div>
  )
}
