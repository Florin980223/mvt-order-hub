import { useMemo, useState } from 'react'
import { Inbox, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { ActionBar } from '../components/emails/ActionBar'
import { PendingOrderAttachments } from '../components/pendingOrders/PendingOrderAttachments'
import { PendingOrderFields } from '../components/pendingOrders/PendingOrderFields'
import { PendingOrderTopBar } from '../components/pendingOrders/PendingOrderTopBar'
import { PendingOrdersTable } from '../components/pendingOrders/PendingOrdersTable'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import type { EmailRow, OrderRow } from '../lib/emails/types'
import { formatOrderStatus } from '../lib/orders/format'
// Reused from PendingOrdersPage — same components, same classes.
import './EmailsPage.css'
import './PendingOrdersPage.css'

interface SentItem {
  email: EmailRow
  order: OrderRow
}

const SENT_STATUSES = ['imported', 'import_failed']

/**
 * No WorkflowProgressCard here (unlike PendingOrdersPage) — that card is
 * hardcoded to needs_validation semantics (always shows step 4 "Pregătire
 * import" as current), which would misrepresent orders that already
 * finished the pipeline, successfully or not.
 */
export function SentOrdersPage() {
  const { data, isLoading, isError, error, refetch } = useEmailsQuery()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const emails = useMemo(() => data ?? [], [data])

  const sentItems = useMemo<SentItem[]>(
    () =>
      emails.flatMap((email) =>
        email.orders.filter((order) => SENT_STATUSES.includes(order.status)).map((order) => ({ email, order })),
      ),
    [emails],
  )

  const selectedItem = sentItems.find((item) => item.order.id === selectedOrderId) ?? sentItems[0] ?? null

  return (
    <div className="pending-orders-page">
      <header className="pending-orders-page__header">
        <h1>Comenzi transmise/importate</h1>
      </header>

      {isLoading && (
        <div className="pending-orders-state pending-orders-state--loading">
          <Loader2 aria-hidden="true" size={24} className="pending-orders-state__spinner" />
          <p>Se încarcă comenzile...</p>
        </div>
      )}

      {isError && (
        <div className="pending-orders-state pending-orders-state--error">
          <TriangleAlert aria-hidden="true" size={24} />
          <p>Comenzile nu au putut fi încărcate{error instanceof Error ? `: ${error.message}` : '.'}</p>
          <button type="button" onClick={() => refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Reîncearcă
          </button>
        </div>
      )}

      {!isLoading && !isError && sentItems.length === 0 && (
        <div className="pending-orders-state pending-orders-state--empty">
          <Inbox aria-hidden="true" size={24} />
          <p>Nu există comenzi transmise încă.</p>
        </div>
      )}

      {!isLoading && !isError && sentItems.length > 0 && (
        <div className="pending-orders-split">
          <div className="pending-orders-split__left">
            <div className="pending-orders-card">
              <h2 className="pending-orders-card__title">Comenzi transmise recent</h2>
              <PendingOrdersTable
                items={sentItems}
                selectedOrderId={selectedItem?.order.id ?? null}
                onSelect={setSelectedOrderId}
                emptyMessage="Nicio comandă transmisă."
              />
            </div>
          </div>

          <div className="pending-orders-split__right">
            {selectedItem && (
              <div className="pending-orders-detail">
                <div className="pending-orders-detail__scroll">
                  <PendingOrderTopBar order={selectedItem.order} />
                  <h2 className="pending-orders-detail__heading">
                    Comandă #{selectedItem.order.client_order_number ?? selectedItem.order.id} — Status:{' '}
                    {formatOrderStatus(selectedItem.order.status)}
                  </h2>
                  <div className="pending-orders-detail__body">
                    <PendingOrderFields order={selectedItem.order} />
                    <PendingOrderAttachments attachments={selectedItem.email.email_attachments} />
                  </div>
                </div>
                <ActionBar order={selectedItem.order} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
