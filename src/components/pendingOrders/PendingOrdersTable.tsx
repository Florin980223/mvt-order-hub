import { useMemo, useState, type KeyboardEvent } from 'react'
import { ArrowUpDown, ChevronRight } from 'lucide-react'
import { AttachmentBadge } from '../emails/AttachmentBadge'
import { StatusBadge } from '../emails/StatusBadge'
import { formatDate, formatTime } from '../../lib/emails/format'
import type { EmailRow, OrderRow } from '../../lib/emails/types'
import { deriveSentOrderStatus } from '../../lib/orders/sentOrderStatus'

interface PendingOrdersTableProps {
  items: Array<{ email: EmailRow; order: OrderRow }>
  selectedOrderId: string | null
  onSelect: (orderId: string) => void
  emptyMessage?: string
  // 'pending' (default) is PendingOrdersPage's Dată/Expeditor/Subiect/Tip
  // fișier/Status columns. 'sent' is SentOrdersPage's own column set
  // (figura4-comenzi-importate.png): Data/Client/Rută/Tip marfă/Status,
  // keyed off order fields instead of email fields, plus a sortable date
  // header and a leading status dot.
  variant?: 'pending' | 'sent'
}

export function PendingOrdersTable({
  items,
  selectedOrderId,
  onSelect,
  emptyMessage = 'Niciun email în așteptare.',
  variant = 'pending',
}: PendingOrdersTableProps) {
  const [sortAscending, setSortAscending] = useState(false)

  const sortedItems = useMemo(() => {
    if (variant !== 'sent') return items
    const copy = [...items]
    copy.sort((a, b) => {
      const diff = new Date(a.email.received_at).getTime() - new Date(b.email.received_at).getTime()
      return sortAscending ? diff : -diff
    })
    return copy
  }, [items, variant, sortAscending])

  if (items.length === 0) {
    return <div className="pending-orders-table-empty">{emptyMessage}</div>
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, orderId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(orderId)
    }
  }

  if (variant === 'sent') {
    return (
      <table className="pending-orders-table pending-orders-table--sent">
        <thead>
          <tr>
            <th>
              <button
                type="button"
                className="pending-orders-table__sort-btn"
                onClick={() => setSortAscending((current) => !current)}
                aria-label={sortAscending ? 'Sortează descrescător după dată' : 'Sortează crescător după dată'}
              >
                Data
                <ArrowUpDown aria-hidden="true" size={12} />
              </button>
            </th>
            <th>Client</th>
            <th>Rută</th>
            <th>Tip marfă</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(({ email, order }) => {
            const sentStatus = deriveSentOrderStatus(order)
            const isSelected = order.id === selectedOrderId
            const dotClass = isSelected
              ? 'pending-orders-table__dot--selected'
              : sentStatus === 'import_failed'
                ? 'pending-orders-table__dot--error'
                : 'pending-orders-table__dot--ok'

            return (
              <tr
                key={order.id}
                className={
                  isSelected ? 'pending-orders-table__row pending-orders-table__row--selected' : 'pending-orders-table__row'
                }
                role="button"
                tabIndex={0}
                onClick={() => onSelect(order.id)}
                onKeyDown={(event) => handleKeyDown(event, order.id)}
              >
                <td>
                  <span className="pending-orders-table__date-cell">
                    <span className={`pending-orders-table__dot ${dotClass}`} aria-hidden="true" />
                    <span className="pending-orders-table__datetime">
                      <span>{formatDate(email.received_at)}</span>
                      <span>{formatTime(email.received_at)}</span>
                    </span>
                  </span>
                </td>
                <td>{order.client_name ?? '—'}</td>
                <td>
                  <span className="pending-orders-table__route">
                    {order.pickup_address ?? '—'}
                    {' → '}
                    {order.delivery_address ?? '—'}
                  </span>
                </td>
                <td>{order.cargo_type ?? '—'}</td>
                <td>
                  <span className="pending-orders-table__status-cell">
                    <StatusBadge status={sentStatus} />
                    <ChevronRight aria-hidden="true" size={14} className="pending-orders-table__row-chevron" />
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
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
            <td>
              <span className="pending-orders-table__datetime">
                <span>{formatDate(email.received_at)}</span>
                <span>{formatTime(email.received_at)}</span>
              </span>
            </td>
            <td>{email.sender}</td>
            <td>
              <span className="pending-orders-table__subject">{email.subject ?? '(fără subiect)'}</span>
            </td>
            <td>
              {email.email_attachments.length > 0
                ? email.email_attachments.map((attachment) => (
                    <AttachmentBadge key={attachment.id} mimeType={attachment.mime_type} filename={attachment.filename} />
                  ))
                : '—'}
            </td>
            <td>
              <span className="pending-orders-table__status-cell">
                <StatusBadge status={email.status} />
                <ChevronRight aria-hidden="true" size={14} className="pending-orders-table__row-chevron" />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
