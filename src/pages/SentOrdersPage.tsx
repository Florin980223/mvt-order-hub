import { useMemo, useState } from 'react'
import { Inbox, Loader2, MoreVertical, RefreshCw, Reply, Search, SlidersHorizontal, Star, TriangleAlert } from 'lucide-react'
import { PendingOrderFields } from '../components/pendingOrders/PendingOrderFields'
import { PendingOrdersTable } from '../components/pendingOrders/PendingOrdersTable'
import { SentOrderActionBar } from '../components/sentOrders/SentOrderActionBar'
import { SentOrderSummary } from '../components/sentOrders/SentOrderSummary'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { useProfilesQuery } from '../lib/settings/useProfilesQuery'
import type { EmailRow, OrderRow } from '../lib/emails/types'
// Reused from PendingOrdersPage/EmailsPage — same components, same classes.
import './EmailsPage.css'
import './PendingOrdersPage.css'
import './SentOrdersPage.css'

interface SentItem {
  email: EmailRow
  order: OrderRow
}

const SENT_STATUSES = ['imported', 'import_failed']

type TabKey = 'all' | 'today' | 'confirmation_sent' | 'follow_up'

function matchesSentSearch(item: SentItem, searchText: string): boolean {
  if (searchText.trim().length === 0) return true
  const needle = searchText.trim().toLowerCase()
  const { order } = item
  return (
    (order.client_name ?? '').toLowerCase().includes(needle) ||
    (order.client_order_number ?? '').toLowerCase().includes(needle) ||
    (order.pickup_address ?? '').toLowerCase().includes(needle) ||
    (order.delivery_address ?? '').toLowerCase().includes(needle)
  )
}

function isToday(isoString: string | null): boolean {
  if (!isoString) return false
  const date = new Date(isoString)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  )
}

/**
 * No WorkflowProgressCard here (unlike PendingOrdersPage) — that card is
 * hardcoded to needs_validation semantics (always shows step 4 "Pregătire
 * import" as current), which would misrepresent orders that already
 * finished the pipeline, successfully or not.
 */
export function SentOrdersPage() {
  const { data, isLoading, isError, error, refetch } = useEmailsQuery()
  const { data: profiles } = useProfilesQuery()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [favoriteOrderIds, setFavoriteOrderIds] = useState<Set<string>>(new Set())

  const emails = useMemo(() => data ?? [], [data])

  const sentItems = useMemo<SentItem[]>(
    () =>
      emails.flatMap((email) =>
        email.orders.filter((order) => SENT_STATUSES.includes(order.status)).map((order) => ({ email, order })),
      ),
    [emails],
  )

  const counts = useMemo(
    () => ({
      all: sentItems.length,
      today: sentItems.filter((item) => isToday(item.order.imported_at)).length,
      confirmationSent: sentItems.filter((item) =>
        item.order.order_events.some((event) => event.event_type === 'confirmation_sent'),
      ).length,
      // No schema/event signal exists anywhere for "needs follow-up" — stub
      // tab, always 0, per the resolved AskUserQuestion decision rather
      // than inventing a heuristic.
      followUp: 0,
    }),
    [sentItems],
  )

  const visibleItems = useMemo(() => {
    const byTab = sentItems.filter((item) => {
      if (activeTab === 'today') return isToday(item.order.imported_at)
      if (activeTab === 'confirmation_sent') {
        return item.order.order_events.some((event) => event.event_type === 'confirmation_sent')
      }
      if (activeTab === 'follow_up') return false
      return true
    })
    return byTab.filter((item) => matchesSentSearch(item, searchText))
  }, [sentItems, activeTab, searchText])

  const selectedItem = visibleItems.find((item) => item.order.id === selectedOrderId) ?? visibleItems[0] ?? null

  const operatorName = useMemo(() => {
    if (!selectedItem?.order.updated_by || !profiles) return null
    return profiles.find((profile) => profile.id === selectedItem.order.updated_by)?.full_name ?? null
  }, [selectedItem, profiles])

  function toggleFavorite(orderId: string) {
    setFavoriteOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  return (
    <div className="pending-orders-page">
      <header className="pending-orders-page__header">
        <h1>Comenzi importate</h1>
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
          <p>Nu există comenzi importate încă.</p>
        </div>
      )}

      {!isLoading && !isError && sentItems.length > 0 && (
        <div className="pending-orders-split">
          <div className="pending-orders-split__left">
            <div className="pending-orders-card">
              <div className="sent-orders-page__search-row">
                <div className="emails-search sent-orders-page__search">
                  <input
                    type="text"
                    placeholder="Caută după client, nr. comandă, rută..."
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                  />
                  <Search aria-hidden="true" size={16} />
                </div>
                <button type="button" className="emails-filter-button">
                  <SlidersHorizontal aria-hidden="true" size={16} />
                  Filtrează
                </button>
              </div>

              <nav className="emails-tabs">
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'all' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  Toate {counts.all}
                </button>
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'today' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('today')}
                >
                  Importate azi {counts.today}
                </button>
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'confirmation_sent' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('confirmation_sent')}
                >
                  Cu confirmare trimisă {counts.confirmationSent}
                </button>
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'follow_up' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('follow_up')}
                >
                  Necesită follow-up {counts.followUp}
                </button>
              </nav>

              <PendingOrdersTable
                items={visibleItems}
                selectedOrderId={selectedItem?.order.id ?? null}
                onSelect={setSelectedOrderId}
                emptyMessage="Nicio comandă importată."
                variant="sent"
              />
            </div>
          </div>

          <div className="pending-orders-split__right">
            {selectedItem && (
              <div className="pending-orders-detail">
                <div className="pending-orders-detail__scroll">
                  <div className="pending-orders-detail__heading-row">
                    <h2 className="pending-orders-detail__heading">
                      Comandă #{selectedItem.order.client_order_number ?? selectedItem.order.id}
                    </h2>
                    <button
                      type="button"
                      className={`pending-orders-detail__icon-btn${
                        favoriteOrderIds.has(selectedItem.order.id) ? ' pending-orders-detail__icon-btn--active' : ''
                      }`}
                      onClick={() => toggleFavorite(selectedItem.order.id)}
                      aria-label={favoriteOrderIds.has(selectedItem.order.id) ? 'Elimină de la favorite' : 'Adaugă la favorite'}
                    >
                      <Star aria-hidden="true" size={16} fill={favoriteOrderIds.has(selectedItem.order.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" className="pending-orders-detail__icon-btn" aria-label="Răspunde">
                      <Reply aria-hidden="true" size={16} />
                    </button>
                    <button type="button" className="pending-orders-detail__icon-btn" aria-label="Mai multe opțiuni">
                      <MoreVertical aria-hidden="true" size={16} />
                    </button>
                  </div>

                  <SentOrderSummary order={selectedItem.order} attachments={selectedItem.email.email_attachments} />

                  <div className="pending-orders-detail__body">
                    <PendingOrderFields order={selectedItem.order} variant="sent" operatorName={operatorName} />
                  </div>
                </div>
                <SentOrderActionBar order={selectedItem.order} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
