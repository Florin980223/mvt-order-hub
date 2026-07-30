import { useState } from 'react'
import { MoreVertical, Star } from 'lucide-react'
import { ActionBar } from '../emails/ActionBar'
import { PendingOrderFields } from '../pendingOrders/PendingOrderFields'
import { PendingOrderTopBar } from '../pendingOrders/PendingOrderTopBar'
import type { EmailRow } from '../../lib/emails/types'
import { formatOrderStatus } from '../../lib/orders/format'
import { formatDateTime } from '../../lib/emails/format'
import { useOrderCorrection } from '../../lib/orders/useOrderCorrection'

interface DashboardDetailPanelProps {
  email: EmailRow
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

// Mirrors SentOrderActionBar's own EVENT_TYPE_LABELS (not exported from
// there, so duplicated locally here rather than reaching into a
// sentOrders-owned component from the dashboard) — same event_type values
// inserted by submit-order/send-client-confirmation
// (supabase/functions/submit-order/index.ts, send-client-confirmation/index.ts).
const EVENT_TYPE_LABELS: Record<string, string> = {
  order_submitted: 'Comandă importată',
  order_submission_failed: 'Import eșuat',
  confirmation_sent: 'Confirmare trimisă clientului',
}

/** Structurally mirrors PendingOrdersPage's right column — same components, same classes, same heading style. */
export function DashboardDetailPanel({ email, isFavorite, onToggleFavorite }: DashboardDetailPanelProps) {
  const order = email.orders[0] ?? null
  const correction = useOrderCorrection(order)
  // order.order_events is already embedded by useEmailsQuery (same shape
  // SentOrderActionBar's "Vezi istoric import" relies on), so this needs no
  // extra query — a real event log, not a stub.
  const [showHistory, setShowHistory] = useState(false)
  const sortedEvents = order
    ? [...order.order_events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  return (
    <div className="pending-orders-detail">
      <div className="pending-orders-detail__scroll">
        {order ? (
          <>
            <PendingOrderTopBar order={order} attachments={email.email_attachments} />
            <div className="pending-orders-detail__heading-row">
              <h2 className="pending-orders-detail__heading">
                Comandă #{order.client_order_number ?? order.id} – Status: {formatOrderStatus(order.status)}
              </h2>
              {/* No flag/priority icon here — confirmed at native resolution
                  against figura1-dashboard.png that this row is Star + "..."
                  only. The is_priority feature itself (data, mutation,
                  EmailsPage's Prioritare tab) stays intact; this was just its
                  only UI toggle, which never matched either brief mockup's
                  icon row. */}
              {onToggleFavorite && (
                <button
                  type="button"
                  className={`pending-orders-detail__icon-btn${isFavorite ? ' pending-orders-detail__icon-btn--active' : ''}`}
                  onClick={onToggleFavorite}
                  aria-label={isFavorite ? 'Elimină de la favorite' : 'Adaugă la favorite'}
                >
                  <Star aria-hidden="true" size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
              <div className="pending-orders-detail__more">
                <button
                  type="button"
                  className={`pending-orders-detail__icon-btn${showHistory ? ' pending-orders-detail__icon-btn--active' : ''}`}
                  onClick={() => setShowHistory((current) => !current)}
                  aria-label="Mai multe opțiuni"
                  aria-expanded={showHistory}
                >
                  <MoreVertical aria-hidden="true" size={16} />
                </button>
                {showHistory && (
                  <div className="pending-orders-detail__more-panel" role="status">
                    <h4 className="pending-orders-detail__more-panel-title">Istoric eveniment comandă</h4>
                    {sortedEvents.length === 0 ? (
                      <p className="pending-orders-detail__more-panel-empty">Niciun eveniment încă.</p>
                    ) : (
                      <ul className="pending-orders-detail__more-panel-list">
                        {sortedEvents.map((event) => (
                          <li key={event.id}>
                            <span>{EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}</span>
                            <span>{formatDateTime(event.created_at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="pending-orders-detail__body">
              <PendingOrderFields order={order} correction={correction} variant="flat" />
            </div>
          </>
        ) : (
          <div className="emails-detail__not-processed">Comanda nu a fost încă extrasă.</div>
        )}
      </div>
      <ActionBar
        order={order}
        emailId={email.id}
        emailStatus={email.status}
        correction={correction}
        showRetryExtraction={false}
      />
    </div>
  )
}
