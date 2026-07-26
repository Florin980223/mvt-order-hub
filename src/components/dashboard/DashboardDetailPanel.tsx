import { ActionBar } from '../emails/ActionBar'
import { PendingOrderAttachments } from '../pendingOrders/PendingOrderAttachments'
import { PendingOrderFields } from '../pendingOrders/PendingOrderFields'
import { PendingOrderTopBar } from '../pendingOrders/PendingOrderTopBar'
import type { EmailRow } from '../../lib/emails/types'
import { formatOrderStatus } from '../../lib/orders/format'

interface DashboardDetailPanelProps {
  email: EmailRow
}

/** Structurally mirrors PendingOrdersPage's right column — same components, same classes, same heading style. */
export function DashboardDetailPanel({ email }: DashboardDetailPanelProps) {
  const order = email.orders[0] ?? null

  return (
    <div className="pending-orders-detail">
      <div className="pending-orders-detail__scroll">
        {order ? (
          <>
            <PendingOrderTopBar order={order} />
            <h2 className="pending-orders-detail__heading">
              Comandă #{order.client_order_number ?? order.id} — Status: {formatOrderStatus(order.status)}
            </h2>
            <div className="pending-orders-detail__body">
              <PendingOrderFields order={order} />
              <PendingOrderAttachments attachments={email.email_attachments} />
            </div>
          </>
        ) : (
          <div className="emails-detail__not-processed">Comanda nu a fost încă extrasă.</div>
        )}
      </div>
      <ActionBar order={order} />
    </div>
  )
}
