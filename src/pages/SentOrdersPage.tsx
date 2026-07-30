import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Inbox, Loader2, MoreVertical, RefreshCw, Reply, Search, SlidersHorizontal, Star, TriangleAlert } from 'lucide-react'
import { ListFooter } from '../components/emails/ListFooter'
import { STATUS_LABELS } from '../components/emails/StatusBadge'
import { PendingOrderFields } from '../components/pendingOrders/PendingOrderFields'
import { PendingOrdersTable } from '../components/pendingOrders/PendingOrdersTable'
import { SentOrderActionBar } from '../components/sentOrders/SentOrderActionBar'
import { SentOrderSummary } from '../components/sentOrders/SentOrderSummary'
import { supabase } from '../lib/supabaseClient'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { useProfilesQuery } from '../lib/settings/useProfilesQuery'
import type { EmailRow, OrderRow } from '../lib/emails/types'
import { deriveSentOrderStatus } from '../lib/orders/sentOrderStatus'
// Reused from PendingOrdersPage/EmailsPage — same components, same classes.
import './EmailsPage.css'
import './PendingOrdersPage.css'
import './SentOrdersPage.css'

interface SentItem {
  email: EmailRow
  order: OrderRow
}

const SENT_STATUSES = ['imported', 'import_failed']

interface SendEmailReplyResult {
  status: string
}

// 7 rather than Dashboard/EmailsPage's 6 — this page's rows run taller
// (2-line-wrapped Rută/Tip marfă text vs. their single-line email rows),
// and its detail panel is also taller (summary cards + fields), so 6 rows
// left a visible empty gap under the list column. 8 overflowed slightly
// past the detail panel's height; 7 is what actually lines both columns
// up flush. PAGE_SIZE is a page-local constant (each of the three list
// pages declares its own), so this doesn't touch the others.
const PAGE_SIZE = 7

type TabKey = 'all' | 'today' | 'confirmation_sent' | 'follow_up'

// "Valoare transport minimă" — same shape/threshold convention as
// DashboardPage/EmailsPage's own ConfidenceFilter (a fixed small set of
// thresholds via <select>, not a free-text/range input).
type MinTransportFilter = 'all' | '1000' | '3000'

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
  const { data, dataUpdatedAt, isLoading, isError, error, refetch, isFetching } = useEmailsQuery()
  const { data: profiles } = useProfilesQuery()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [favoriteOrderIds, setFavoriteOrderIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  // Same interaction pattern as DashboardPage/EmailsPage's own filter panel
  // (state, panel toggle, active-state styling, "Resetează filtrele").
  // Fields here are carrier/transport-value/priority — real order fields
  // (see OrderRow) that aren't already covered by the 4 tabs above (which
  // cover all/imported-today/confirmation-sent/needs-followup).
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterCarrier, setFilterCarrier] = useState('all')
  const [filterMinTransport, setFilterMinTransport] = useState<MinTransportFilter>('all')
  const [filterIsPriority, setFilterIsPriority] = useState(false)

  // Lifted so both the detail header's kebab ("Mai multe opțiuni") and
  // SentOrderActionBar's own "Vezi istoric import" button toggle the exact
  // same panel instead of each owning an independent copy — see
  // SentOrderActionBar's showHistory/onToggleHistory props.
  const [showHistory, setShowHistory] = useState(false)

  // Inline compose panel for "Răspunde" — same shape/pattern as
  // EmailDetailPanel's own replyMutation (src/components/emails/EmailDetailPanel.tsx),
  // reusing the same send-email-reply Edge Function and payload shape.
  const [replyOpen, setReplyOpen] = useState(false)
  const [replySubject, setReplySubject] = useState('')
  const [replyBody, setReplyBody] = useState('')

  const replyMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const { data: result, error: replyError } = await supabase.functions.invoke<SendEmailReplyResult>('send-email-reply', {
        body: { email_id: emailId, subject: replySubject, body: replyBody },
      })
      if (replyError) throw replyError
      return result
    },
    onSuccess: () => {
      setReplyOpen(false)
      setReplySubject('')
      setReplyBody('')
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })

  const emails = useMemo(() => data ?? [], [data])

  const sentItems = useMemo<SentItem[]>(
    () =>
      emails.flatMap((email) =>
        email.orders.filter((order) => SENT_STATUSES.includes(order.status)).map((order) => ({ email, order })),
      ),
    [emails],
  )

  const carrierOptions = useMemo(() => {
    const carriers = new Set<string>()
    sentItems.forEach((item) => {
      if (item.order.carrier_proposed) carriers.add(item.order.carrier_proposed)
    })
    return Array.from(carriers).sort((a, b) => a.localeCompare(b))
  }, [sentItems])

  const hasActiveFilters = filterCarrier !== 'all' || filterMinTransport !== 'all' || filterIsPriority

  function resetFilters() {
    setFilterCarrier('all')
    setFilterMinTransport('all')
    setFilterIsPriority(false)
  }

  function toggleFilterOpen() {
    setFilterOpen((open) => !open)
  }

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
    return byTab.filter((item) => {
      if (!matchesSentSearch(item, searchText)) return false
      if (filterCarrier !== 'all' && item.order.carrier_proposed !== filterCarrier) return false
      if (filterMinTransport !== 'all') {
        const threshold = filterMinTransport === '1000' ? 1000 : 3000
        if (item.order.transport_amount === null || item.order.transport_amount < threshold) return false
      }
      if (filterIsPriority && !item.order.is_priority) return false
      return true
    })
  }, [sentItems, activeTab, searchText, filterCarrier, filterMinTransport, filterIsPriority])

  // Clamped rather than reset via effect, same pattern as Dashboard/EmailsPage.
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageStart = currentPage * PAGE_SIZE
  const pagedItems = visibleItems.slice(pageStart, pageStart + PAGE_SIZE)

  // Selection stays keyed off the full visibleItems list (not pagedItems)
  // so it still resolves correctly if the selected order is on a
  // different page than the one currently shown.
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

  function toggleReply() {
    setReplyOpen((open) => {
      const next = !open
      if (next && selectedItem) {
        setReplySubject(`Re: ${selectedItem.email.subject ?? '(fără subiect)'}`)
        setReplyBody('')
        replyMutation.reset()
      }
      return next
    })
    setShowHistory(false)
  }

  function toggleHistory() {
    setShowHistory((open) => !open)
    setReplyOpen(false)
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
                <div className="emails-filter">
                  <button
                    type="button"
                    className={`emails-filter-button${hasActiveFilters ? ' emails-filter-button--active' : ''}`}
                    onClick={toggleFilterOpen}
                    aria-expanded={filterOpen}
                  >
                    <SlidersHorizontal aria-hidden="true" size={16} />
                    Filtrează
                  </button>
                  {filterOpen && (
                    <div className="emails-filter-panel">
                      <label className="emails-filter-panel__field">
                        Carrier propus
                        <select value={filterCarrier} onChange={(event) => setFilterCarrier(event.target.value)}>
                          <option value="all">Toți</option>
                          {carrierOptions.map((carrier) => (
                            <option key={carrier} value={carrier}>
                              {carrier}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="emails-filter-panel__field">
                        Valoare transport minimă
                        <select
                          value={filterMinTransport}
                          onChange={(event) => setFilterMinTransport(event.target.value as MinTransportFilter)}
                        >
                          <option value="all">Toate</option>
                          <option value="1000">≥ 1.000 EUR</option>
                          <option value="3000">≥ 3.000 EUR</option>
                        </select>
                      </label>
                      <label className="emails-filter-panel__checkbox">
                        <input
                          type="checkbox"
                          checked={filterIsPriority}
                          onChange={(event) => setFilterIsPriority(event.target.checked)}
                        />
                        Prioritare
                      </label>
                      {hasActiveFilters && (
                        <button type="button" className="emails-filter-panel__reset" onClick={resetFilters}>
                          Resetează filtrele
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <nav className="emails-tabs sent-orders-page__tabs">
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'all' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  Toate
                  <span className="sent-orders-page__tab-count sent-orders-page__tab-count--blue">{counts.all}</span>
                </button>
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'today' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('today')}
                >
                  Importate azi
                  <span className="sent-orders-page__tab-count sent-orders-page__tab-count--green">{counts.today}</span>
                </button>
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'confirmation_sent' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('confirmation_sent')}
                >
                  Cu confirmare trimisă
                  <span className="sent-orders-page__tab-count sent-orders-page__tab-count--blue">{counts.confirmationSent}</span>
                </button>
                <button
                  type="button"
                  className={`emails-tabs__tab${activeTab === 'follow_up' ? ' emails-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab('follow_up')}
                >
                  Necesită follow-up
                  <span className="sent-orders-page__tab-count sent-orders-page__tab-count--orange">{counts.followUp}</span>
                </button>
              </nav>

              <PendingOrdersTable
                items={pagedItems}
                selectedOrderId={selectedItem?.order.id ?? null}
                onSelect={setSelectedOrderId}
                emptyMessage="Nicio comandă importată."
                variant="sent"
              />

              <ListFooter
                dataUpdatedAt={dataUpdatedAt}
                rangeStart={pageStart + 1}
                rangeEnd={Math.min(pageStart + PAGE_SIZE, visibleItems.length)}
                total={visibleItems.length}
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevPage={() => setPage(currentPage - 1)}
                onNextPage={() => setPage(currentPage + 1)}
                onRefresh={() => refetch()}
                isRefreshing={isFetching}
              />
            </div>
          </div>

          <div className="pending-orders-split__right">
            {selectedItem && (
              <div className="pending-orders-detail">
                <div className="pending-orders-detail__scroll">
                  <div className="pending-orders-detail__heading-row">
                    <h2 className="pending-orders-detail__heading">
                      Comandă #{selectedItem.order.client_order_number ?? selectedItem.order.id} — Status:{' '}
                      <span className={`sent-orders-detail__status sent-orders-detail__status--${deriveSentOrderStatus(selectedItem.order)}`}>
                        {STATUS_LABELS[deriveSentOrderStatus(selectedItem.order)]}
                      </span>
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
                    <div className="pending-orders-detail__reply emails-detail__reply">
                      <button
                        type="button"
                        className={`pending-orders-detail__icon-btn${replyOpen ? ' pending-orders-detail__icon-btn--active' : ''}`}
                        onClick={toggleReply}
                        aria-label="Răspunde"
                        aria-expanded={replyOpen}
                      >
                        <Reply aria-hidden="true" size={16} />
                      </button>
                      {replyOpen && (
                        <div className="emails-detail__reply-panel" role="dialog" aria-label="Răspunde la email">
                          <h4 className="emails-detail__reply-panel-title">Răspunde</h4>
                          <label className="emails-detail__reply-field">
                            Către
                            <input type="text" value={selectedItem.email.sender} readOnly disabled />
                          </label>
                          <label className="emails-detail__reply-field">
                            Subiect
                            <input
                              type="text"
                              value={replySubject}
                              onChange={(event) => setReplySubject(event.target.value)}
                            />
                          </label>
                          <label className="emails-detail__reply-field">
                            Mesaj
                            <textarea
                              value={replyBody}
                              onChange={(event) => setReplyBody(event.target.value)}
                              rows={5}
                              required
                            />
                          </label>
                          {replyMutation.isError && (
                            <p className="emails-action-bar__error" role="alert">
                              {replyMutation.error instanceof Error ? replyMutation.error.message : 'Trimiterea răspunsului a eșuat.'}
                            </p>
                          )}
                          <div className="emails-detail__reply-actions">
                            <button
                              type="button"
                              className="emails-detail__reply-cancel"
                              onClick={() => {
                                setReplyOpen(false)
                                setReplySubject('')
                                setReplyBody('')
                                replyMutation.reset()
                              }}
                            >
                              Anulează
                            </button>
                            <button
                              type="button"
                              className="emails-detail__reply-send"
                              disabled={replyBody.trim().length === 0 || replyMutation.isPending}
                              onClick={() => replyMutation.mutate(selectedItem.email.id)}
                            >
                              {replyMutation.isPending ? 'Se trimite...' : 'Trimite'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`pending-orders-detail__icon-btn${showHistory ? ' pending-orders-detail__icon-btn--active' : ''}`}
                      onClick={toggleHistory}
                      aria-label="Mai multe opțiuni"
                      aria-expanded={showHistory}
                    >
                      <MoreVertical aria-hidden="true" size={16} />
                    </button>
                  </div>

                  <SentOrderSummary order={selectedItem.order} attachments={selectedItem.email.email_attachments} />

                  <div className="pending-orders-detail__body">
                    <PendingOrderFields order={selectedItem.order} variant="sent" operatorName={operatorName} />
                  </div>
                </div>
                <SentOrderActionBar order={selectedItem.order} showHistory={showHistory} onToggleHistory={toggleHistory} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
