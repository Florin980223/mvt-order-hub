interface ConfidenceBadgeProps {
  confidence: number | null
}

/** ≥85% green, 60–84% amber, <60% red — same breakpoints as the Phase 5a emails.status extraction rule. */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence === null) {
    return <div className="emails-confidence-badge emails-confidence-badge--neutral">—</div>
  }

  const percent = Math.round(confidence * 100)
  const className =
    confidence >= 0.85
      ? 'emails-confidence-badge--high'
      : confidence >= 0.6
        ? 'emails-confidence-badge--medium'
        : 'emails-confidence-badge--low'

  return (
    <div className={`emails-confidence-badge ${className}`} title={`${percent}% încredere`}>
      {percent}%
    </div>
  )
}
