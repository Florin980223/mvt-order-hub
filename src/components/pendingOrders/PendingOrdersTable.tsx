import type { KeyboardEvent } from 'react'
import { AttachmentBadge } from '../emails/AttachmentBadge'
import { formatDate } from '../../lib/emails/format'
import type { EmailRow, OrderRow } from '../../lib/emails/types'
import { formatOrderStatus } from '../../lib/orders/format'

interface PendingOrdersTableProps {
  items: Array<{ email: EmailRow; order: OrderRow }>
  selectedOrderId: string | null
  onSelect: (orderId: string) => void
  emptyMessage?: string
}

export function PendingOrdersTable({
  items,
  selectedOrderId,
  onSelect,
  emptyMessage = 'Niciun email în așteptare.',
}: PendingOrdersTableProps) {
  if (items.length === 0) {
    return <div className="pending-orders-table-empty">{emptyMessage}</div>
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, orderId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(orderId)
    }
  }

  return (
    <table className="pending-orders-table">
      <thead>
        <tr>
          <th>Dată</th>
          <th>Expeditor</th>
          <th>Subiect</th>
          <th>Tip fișier</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map(({ email, order }) => (
          <tr
            key={order.id}
            className={
              order.id === selectedOrderId
                ? 'pending-orders-table__row pending-orders-table__row--selected'
                : 'pending-orders-table__row'
            }
            role="button"
            tabIndex={0}
            onClick={() => onSelect(order.id)}
            onKeyDown={(event) => handleKeyDown(event, order.id)}
          >
            <td>{formatDate(email.received_at)}</td>
            <td>{email.sender}</td>
            <td>{email.subject ?? '(fără subiect)'}</td>
            <td>
              {email.email_attachments.length > 0
                ? email.email_attachments.map((attachment) => (
                    <AttachmentBadge key={attachment.id} mimeType={attachment.mime_type} filename={attachment.filename} />
                  ))
                : '—'}
            </td>
            <td>{formatOrderStatus(order.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
