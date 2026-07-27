import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { ActionBar } from '../components/emails/ActionBar'
import { PendingOrderAttachments } from '../components/pendingOrders/PendingOrderAttachments'
import { PendingOrderFields } from '../components/pendingOrders/PendingOrderFields'
import { PendingOrderTopBar } from '../components/pendingOrders/PendingOrderTopBar'
import { PendingOrdersTable } from '../components/pendingOrders/PendingOrdersTable'
import { WorkflowProgressCard } from '../components/pendingOrders/WorkflowProgressCard'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import type { EmailRow, OrderRow } from '../lib/emails/types'
import { formatOrderStatus } from '../lib/orders/format'
import { useOrderCorrection } from '../lib/orders/useOrderCorrection'
// ActionBar/ConfidenceBadge/AttachmentBadge (reused from Phase 5b) are styled
// by EmailsPage.css, not colocated with the components themselves — import
// it here too so this page renders them correctly even if /emails was never
// visited first in the same session.
import './EmailsPage.css'
import './PendingOrdersPage.css'

interface PendingItem {
  email: EmailRow
  order: OrderRow
}

export function PendingOrdersPage() {
  const { data, isLoading, isError, error, refetch } = useEmailsQuery()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const emails = useMemo(() => data ?? [], [data])

  const pendingItems = useMemo<PendingItem[]>(
    () =>
      emails.flatMap((email) =>
        email.orders.filter((order) => order.status === 'needs_validation').map((order) => ({ email, order })),
      ),
    [emails],
  )

  // Derived rather than effect-driven, same pattern as EmailsPage.
  const selectedItem = pendingItems.find((item) => item.order.id === selectedOrderId) ?? pendingItems[0] ?? null
  const correction = useOrderCorrection(selectedItem?.order ?? null)

  return (
    <div className="pending-orders-page">
      <header className="pending-orders-page__header">
        <h1>Comenzi în așteptare</h1>
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

      {!isLoading && !isError && pendingItems.length === 0 && (
        <div className="pending-orders-state pending-orders-state--empty">
          <Inbox aria-hidden="true" size={24} />
          <p>Nu există comenzi în așteptare.</p>
        </div>
      )}

      {!isLoading && !isError && pendingItems.length > 0 && (
        <div className="pending-orders-split">
          <div className="pending-orders-split__left">
            <WorkflowProgressCard />
            <div className="pending-orders-card">
              <h2 className="pending-orders-card__title">Emailuri recente în așteptare</h2>
              <PendingOrdersTable
                items={pendingItems}
                selectedOrderId={selectedItem?.order.id ?? null}
                onSelect={setSelectedOrderId}
              />
              <Link to="/emails" className="pending-orders-card__link">
                Vezi toate emailurile în așteptare
              </Link>
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
                    <PendingOrderFields order={selectedItem.order} correction={correction} />
                    <PendingOrderAttachments attachments={selectedItem.email.email_attachments} />
                  </div>
                </div>
                <ActionBar
                  order={selectedItem.order}
                  emailId={selectedItem.email.id}
                  emailStatus={selectedItem.email.status}
                  correction={correction}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
