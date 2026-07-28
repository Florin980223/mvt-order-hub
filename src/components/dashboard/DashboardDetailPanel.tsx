import { Flag, MoreVertical, Star } from 'lucide-react'
import { ActionBar } from '../emails/ActionBar'
import { PendingOrderFields } from '../pendingOrders/PendingOrderFields'
import { PendingOrderTopBar } from '../pendingOrders/PendingOrderTopBar'
import type { EmailRow } from '../../lib/emails/types'
import { formatOrderStatus } from '../../lib/orders/format'
import { useOrderCorrection } from '../../lib/orders/useOrderCorrection'
import { useTogglePriorityMutation } from '../../lib/orders/useTogglePriorityMutation'

interface DashboardDetailPanelProps {
  email: EmailRow
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

/** Structurally mirrors PendingOrdersPage's right column — same components, same classes, same heading style. */
export function DashboardDetailPanel({ email, isFavorite, onToggleFavorite }: DashboardDetailPanelProps) {
  const order = email.orders[0] ?? null
  const correction = useOrderCorrection(order)
  const togglePriority = useTogglePriorityMutation(order)

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
              <button
                type="button"
                className={`pending-orders-detail__icon-btn${order.is_priority ? ' pending-orders-detail__icon-btn--priority' : ''}`}
                onClick={() => togglePriority.mutate()}
                disabled={togglePriority.isPending}
                aria-label={order.is_priority ? 'Elimină prioritatea' : 'Marchează ca prioritară'}
              >
                <Flag aria-hidden="true" size={16} fill={order.is_priority ? 'currentColor' : 'none'} />
              </button>
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
              <button type="button" className="pending-orders-detail__icon-btn" aria-label="Mai multe opțiuni">
                <MoreVertical aria-hidden="true" size={16} />
              </button>
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
