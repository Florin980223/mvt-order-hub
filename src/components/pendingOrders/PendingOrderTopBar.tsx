import { CheckCircle2, History, Sparkles, TriangleAlert } from 'lucide-react'
import { ConfidenceBadge } from '../emails/ConfidenceBadge'
import type { EmailAttachmentRow, OrderRow } from '../../lib/emails/types'
import { countLowConfidenceFields } from '../../lib/orders/orderFields'
import { checkImportReadiness } from '../../lib/orders/importReadiness'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'
import { PendingOrderAttachments } from './PendingOrderAttachments'

interface PendingOrderTopBarProps {
  order: OrderRow
  // When passed (Dashboard only), attachments render inline here, in the
  // "Istoric AI" button's slot, matching figura1-dashboard.png. Omitted
  // elsewhere (PendingOrdersPage) preserves today's layout exactly.
  attachments?: EmailAttachmentRow[]
  // EmailsPage only (figura2-emailuri-noi.png): when true and `attachments`
  // isn't passed (EmailsPage renders its own attachments section above this
  // component instead), the trailing slot shows a readiness pill instead of
  // the "Istoric AI" button.
  showReadiness?: boolean
  // PendingOrdersPage only (figura3-comenzi-asteptare.png): swaps the ring
  // gauge + heading/detail text for a simple checkmark+percentage pill, and
  // the warning pill gains an icon + "necesită validare" wording. Dashboard/
  // EmailsPage/SentOrdersPage keep the ring — their own mockups show it.
  compactConfidence?: boolean
}

/**
 * Neither AI re-extraction nor order history is scoped to any phase in
 * docs/ROADMAP.md — reusing ActionBar's "Disponibil din Faza 6" wording
 * here would assert something the docs don't support, so these use
 * accurate, phase-neutral tooltips instead.
 */
export function PendingOrderTopBar({ order, attachments, showReadiness, compactConfidence }: PendingOrderTopBarProps) {
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  const lowConfidenceCount = countLowConfidenceFields(order, confidenceThreshold)
  const overallPercent = order.confidence_overall != null ? Math.round(order.confidence_overall * 100) : null
  const readiness = checkImportReadiness(order, confidenceThreshold)

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

      {compactConfidence ? (
        <span className="pending-orders-topbar__confidence-pill">
          <CheckCircle2 aria-hidden="true" size={14} />
          {overallPercent != null ? `${overallPercent}% match` : '—'}
        </span>
      ) : (
        <div className="pending-orders-topbar__confidence">
          <ConfidenceBadge confidence={order.confidence_overall} />
          <div className="confidence-label">
            <span className="confidence-label__heading">Încredere extragere</span>
            <span className="confidence-label__detail">
              {overallPercent != null ? `${overallPercent}% date recunoscute` : '—'}
            </span>
          </div>
        </div>
      )}

      {lowConfidenceCount > 0 &&
        (compactConfidence ? (
          <span className="pending-orders-topbar__warning pending-orders-topbar__warning--compact">
            <TriangleAlert aria-hidden="true" size={14} />
            {lowConfidenceCount} câmpuri necesită validare
          </span>
        ) : (
          <span className="pending-orders-topbar__warning">{lowConfidenceCount} câmpuri sub prag de încredere</span>
        ))}

      {/* Pushed to the row's far right in all three mockups that use this
          trailing slot (figura1/figura2/figura3) — was left-packed right
          after the warning pill before. */}
      <div className="pending-orders-topbar__trailing">
        {attachments ? (
          <PendingOrderAttachments attachments={attachments} variant="inline" />
        ) : showReadiness ? (
          readiness.ready && (
            <span className="pending-orders-topbar__readiness">
              <CheckCircle2 aria-hidden="true" size={14} />
              Date pregătite pentru validare
            </span>
          )
        ) : (
          <button
            type="button"
            className="pending-orders-topbar__btn"
            disabled
            title="Istoricul comenzii nu este încă disponibil"
          >
            <History aria-hidden="true" size={16} />
            Istoric AI
          </button>
        )}
      </div>
    </div>
  )
}
