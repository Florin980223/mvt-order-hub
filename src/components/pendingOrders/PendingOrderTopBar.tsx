import { ConfidenceBadge } from '../emails/ConfidenceBadge'
import type { OrderRow } from '../../lib/emails/types'
import { countLowConfidenceFields } from '../../lib/orders/orderFields'

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
  const lowConfidenceCount = countLowConfidenceFields(order)

  return (
    <div className="pending-orders-topbar">
      <button type="button" className="pending-orders-topbar__btn" disabled title="Fallback AI neimplementat încă">
        Extrage Automat cu AI
      </button>
      <ConfidenceBadge confidence={order.confidence_overall} />
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
