import { CheckCircle2 } from 'lucide-react'
import { PendingOrderAttachments } from '../pendingOrders/PendingOrderAttachments'
import { formatDateTime } from '../../lib/emails/format'
import type { EmailAttachmentRow, OrderRow } from '../../lib/emails/types'

interface SentOrderSummaryProps {
  order: OrderRow
  attachments: EmailAttachmentRow[]
}

/**
 * figura4-comenzi-importate.png's top info-card row — no equivalent
 * anywhere else (PendingOrderTopBar's gauge/warning-pill logic is entirely
 * extraction-driven and meaningless for an order that's already imported).
 */
export function SentOrderSummary({ order, attachments }: SentOrderSummaryProps) {
  return (
    <div className="sent-order-summary">
      <div className="sent-order-summary__banner">
        <CheckCircle2 aria-hidden="true" size={16} />
        Import reușit
      </div>
      <div className="sent-order-summary__card">
        <span className="sent-order-summary__card-label">AscendTMS ID</span>
        <span className="sent-order-summary__card-value">{order.external_reference_id ?? '—'}</span>
      </div>
      <div className="sent-order-summary__card">
        <span className="sent-order-summary__card-label">Importată la</span>
        <span className="sent-order-summary__card-value">{formatDateTime(order.imported_at)}</span>
      </div>
      <div className="sent-order-summary__attachments">
        <span className="sent-order-summary__card-label">Atașamente</span>
        <PendingOrderAttachments attachments={attachments} variant="inline" showHeading={false} />
      </div>
    </div>
  )
}
