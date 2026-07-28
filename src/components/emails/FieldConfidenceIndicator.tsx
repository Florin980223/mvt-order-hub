import { CheckCircle2, TriangleAlert } from 'lucide-react'

interface FieldConfidenceIndicatorProps {
  confidence: number | null
  threshold: number
}

/** Used by PendingOrderFields — a green check for fields at/above the
 * admin-configured threshold, an amber warning for fields below it. */
export function FieldConfidenceIndicator({ confidence, threshold }: FieldConfidenceIndicatorProps) {
  if (confidence == null) return null

  if (confidence >= threshold) {
    return (
      <CheckCircle2
        aria-hidden="true"
        size={14}
        className="field-confidence-indicator field-confidence-indicator--ok"
      />
    )
  }

  return (
    <span className="field-confidence-indicator field-confidence-indicator--warning">
      <TriangleAlert aria-hidden="true" size={14} />
      Necesită verificare
    </span>
  )
}
