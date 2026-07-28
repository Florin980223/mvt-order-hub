import { Sparkles } from 'lucide-react'
import { ConfidenceBadge } from '../emails/ConfidenceBadge'
import type { OrderRow } from '../../lib/emails/types'
import { countLowConfidenceFields } from '../../lib/orders/orderFields'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'

interface PendingOrderTopBarProps {
  order: OrderRow
}

/**
 * Neither AI re-extraction nor order history is scoped to any phase in
 * docs/ROADMAP.md — reusing ActionBar's "Disponibil din Faza 6" wording
 * here would assert something the docs don't support, so these use
 * accurate, phase-neutral tooltips instead.
 */
export function PendingOrderTopBar({ order }: PendingOrderTopBarProps) {
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  const lowConfidenceCount = countLowConfidenceFields(order, confidenceThreshold)
  const overallPercent = order.confidence_overall != null ? Math.round(order.confidence_overall * 100) : null

  return (
    <div className="pending-orders-topbar">
      <button
        type="button"
        className="pending-orders-topbar__btn pending-orders-topbar__btn--primary"
        disabled
        title="Fallback AI neimplementat încă"
      >
        <Sparkles aria-hidden="true" size={16} />
        Extrage Automat cu AI
      </button>

      <div className="pending-orders-topbar__confidence">
        <ConfidenceBadge confidence={order.confidence_overall} />
        <div className="confidence-label">
          <span className="confidence-label__heading">Încredere extragere</span>
          <span className="confidence-label__detail">
            {overallPercent != null ? `${overallPercent}% date recunoscute` : '—'}
          </span>
        </div>
      </div>

      {lowConfidenceCount > 0 && (
        <span className="pending-orders-topbar__warning">{lowConfidenceCount} câmpuri sub prag de încredere</span>
      )}
      <button
        type="button"
        className="pending-orders-topbar__btn"
        disabled
        title="Istoricul comenzii nu este încă disponibil"
      >
        Istoric AI
      </button>
    </div>
  )
}
