import { CheckCircle2, TriangleAlert } from 'lucide-react'

interface FieldConfidenceIndicatorProps {
  confidence: number | null
  threshold: number
  // PendingOrdersPage's sectioned variant only (figura3-comenzi-asteptare.png)
  // — shows "NN%" next to the icon. Off by default so Dashboard's flat and
  // EmailsPage's preview variants stay icon-only, unchanged.
  showPercent?: boolean
}

/** Used by PendingOrderFields — a green check for fields at/above the
 * admin-configured threshold, an amber warning for fields below it. */
export function FieldConfidenceIndicator({ confidence, threshold, showPercent }: FieldConfidenceIndicatorProps) {
  if (confidence == null) return null
  const percent = showPercent ? Math.round(confidence * 100) : null

  if (confidence >= threshold) {
    return (
      <span className="field-confidence-indicator field-confidence-indicator--ok">
        {percent != null && <span className="field-confidence-indicator__percent">{percent}%</span>}
        <CheckCircle2 aria-hidden="true" size={14} />
      </span>
    )
  }

  return (
    <span className="field-confidence-indicator field-confidence-indicator--warning">
      {percent != null && <span className="field-confidence-indicator__percent">{percent}%</span>}
      <TriangleAlert aria-hidden="true" size={14} />
      Necesită verificare
    </span>
  )
}
