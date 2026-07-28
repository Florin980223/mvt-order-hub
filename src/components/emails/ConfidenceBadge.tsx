import type { CSSProperties } from 'react'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'

interface ConfidenceBadgeProps {
  confidence: number | null
}

/** 2-tier: at/above the admin-configured threshold is green, below it is red — a single source of truth for "acceptable confidence" (see docs/BRIEF.md 5.4/9.3), replacing the previous hardcoded 3-tier 0.85/0.6 split. */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const threshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD

  if (confidence === null) {
    return (
      <div className="emails-confidence-badge emails-confidence-badge--neutral">
        <span className="emails-confidence-badge__text">—</span>
      </div>
    )
  }

  const percent = Math.round(confidence * 100)
  const className = confidence >= threshold ? 'emails-confidence-badge--high' : 'emails-confidence-badge--low'

  return (
    <div
      className={`emails-confidence-badge ${className}`}
      style={{ '--confidence-percent': percent } as CSSProperties}
      title={`${percent}% încredere`}
    >
      <span className="emails-confidence-badge__text">
        <span className="emails-confidence-badge__percent">{percent}%</span>
        <span className="emails-confidence-badge__label">match</span>
      </span>
    </div>
  )
}
