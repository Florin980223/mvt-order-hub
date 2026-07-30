import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, Filter, Inbox, Loader2, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { DashboardDetailPanel } from '../components/dashboard/DashboardDetailPanel'
import { EmailList } from '../components/emails/EmailList'
import { ListFooter } from '../components/emails/ListFooter'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { matchesSearch } from '../lib/emails/search'
import type { EmailRow } from '../lib/emails/types'
// EmailList/ActionBar/ConfidenceBadge styles live in EmailsPage.css, and
// PendingOrderTopBar/PendingOrderFields/PendingOrderAttachments (reused via
// DashboardDetailPanel) live in PendingOrdersPage.css — neither is
// colocated with its component, so both are imported here directly.
import './EmailsPage.css'
import './PendingOrdersPage.css'
import './DashboardPage.css'

const PAGE_SIZE = 6

type TabKey = 'all' | 'needs_validation' | 'imported'

type SortKey = 'date_desc' | 'date_asc' | 'confidence_desc' | 'confidence_asc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: 'Cele mai recente' },
  { key: 'date_asc', label: 'Cele mai vechi' },
  { key: 'confidence_desc', label: 'Încredere AI (descrescător)' },
  { key: 'confidence_asc', label: 'Încredere AI (crescător)' },
]

type ConfidenceFilter = 'all' | '0.8' | '0.5'

// Average of the email's orders' confidence_overall — null when the email
// has no orders (or none with a score) yet, so it always sinks to the
// bottom of a confidence sort rather than being treated as 0%.
function emailConfidence(email: EmailRow): number | null {
  const values = email.orders.map((order) => order.confidence_overall).filter((value): value is number => value !== null)
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function DashboardPage() {
  const { data, dataUpdatedAt, isLoading, isError, error, refetch, isFetching } = useEmailsQuery()
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchText, setSearchText] = useState('')
  const [favoriteEmailIds, setFavoriteEmailIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  const [sortKey, setSortKey] = useState<SortKey>('date_desc')
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterHasAttachments, setFilterHasAttachments] = useState(false)
  const [filterIsPriority, setFilterIsPriority] = useState(false)
  const [filterMinConfidence, setFilterMinConfidence] = useState<ConfidenceFilter>('all')
  const [filterCarrier, setFilterCarrier] = useState('all')

  const emails = useMemo(() => data ?? [], [data])

  const carrierOptions = useMemo(() => {
    const carriers = new Set<string>()
    emails.forEach((email) => {
      email.orders.forEach((order) => {
        if (order.carrier_proposed) carriers.add(order.carrier_proposed)
      })
    })
    return Array.from(carriers).sort((a, b) => a.localeCompare(b))
  }, [emails])

  const hasActiveFilters =
    filterHasAttachments || filterIsPriority || filterMinConfidence !== 'all' || filterCarrier !== 'all'

  function resetFilters() {
    setFilterHasAttachments(false)
    setFilterIsPriority(false)
    setFilterMinConfidence('all')
    setFilterCarrier('all')
  }

  function toggleSortOpen() {
    setSortOpen((open) => !open)
    setFilterOpen(false)
  }

  function toggleFilterOpen() {
    setFilterOpen((open) => !open)
    setSortOpen(false)
  }

  const summary = useMemo(() => {
    const total = emails.length
    const needsValidation = emails.filter((email) => email.status === 'needs_validation').length
    const imported = emails.flatMap((email) => email.orders).filter((order) => order.status === 'imported').length
    return { total, needsValidation, imported }
  }, [emails])

  const filteredEmails = useMemo(() => {
    const byTab = emails.filter((email) => {
      if (activeTab === 'needs_validation') return email.status === 'needs_validation'
      if (activeTab === 'imported') return email.orders.some((order) => order.status === 'imported')
      return true
    })
    return byTab.filter((email) => {
      if (!matchesSearch(email, searchText)) return false
      if (filterHasAttachments && email.email_attachments.length === 0) return false
      if (filterIsPriority && !email.orders.some((order) => order.is_priority)) return false
      if (filterMinConfidence !== 'all') {
        const threshold = filterMinConfidence === '0.8' ? 0.8 : 0.5
        const confidence = emailConfidence(email)
        if (confidence === null || confidence < threshold) return false
      }
      if (filterCarrier !== 'all' && !email.orders.some((order) => order.carrier_proposed === filterCarrier)) return false
      return true
    })
  }, [emails, activeTab, searchText, filterHasAttachments, filterIsPriority, filterMinConfidence, filterCarrier])

  // Sorted separately from filtering so a sort-only change doesn't need to
  // re-run the tab/search/filter predicates.
  const visibleEmails = useMemo(() => {
    const sorted = [...filteredEmails]
    sorted.sort((a, b) => {
      if (sortKey === 'date_asc') return new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
      if (sortKey === 'date_desc') return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      const confidenceA = emailConfidence(a)
      const confidenceB = emailConfidence(b)
      // Emails without a confidence score sink to the bottom regardless of
      // sort direction, rather than being sorted as if their score were 0.
      if (confidenceA === null && confidenceB === null) return 0
      if (confidenceA === null) return 1
      if (confidenceB === null) return -1
      return sortKey === 'confidence_asc' ? confidenceA - confidenceB : confidenceB - confidenceA
    })
    return sorted
  }, [filteredEmails, sortKey])

  // Clamped rather than reset via effect: filters changing shouldn't need a
  // setState round-trip just to keep the page in range.
  const totalPages = Math.max(1, Math.ceil(visibleEmails.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageStart = currentPage * PAGE_SIZE
  const pagedEmails = visibleEmails.slice(pageStart, pageStart + PAGE_SIZE)

  // Derived rather than effect-driven, same pattern as EmailsPage/PendingOrdersPage.
  const selectedEmail = emails.find((email) => email.id === selectedEmailId) ?? emails[0] ?? null

  function toggleFavorite(emailId: string) {
    setFavoriteEmailIds((prev) => {
      const next = new Set(prev)
      if (next.has(emailId)) next.delete(emailId)
      else next.add(emailId)
      return next
    })
  }

  return (
    <div className="dashboard-page">
      {isLoading && (
        <div className="dashboard-state dashboard-state--loading">
          <Loader2 aria-hidden="true" size={24} className="dashboard-state__spinner" />
          <p>Se încarcă datele...</p>
        </div>
      )}

      {isError && (
        <div className="dashboard-state dashboard-state--error">
          <TriangleAlert aria-hidden="true" size={24} />
          <p>Datele nu au putut fi încărcate{error instanceof Error ? `: ${error.message}` : '.'}</p>
          <button type="button" onClick={() => refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Reîncearcă
          </button>
        </div>
      )}

      {!isLoading && !isError && emails.length === 0 && (
        <div className="dashboard-state dashboard-state--empty">
          <Inbox aria-hidden="true" size={24} />
          <p>Nu există emailuri.</p>
        </div>
      )}

      {!isLoading && !isError && emails.length > 0 && (
        <div className="dashboard-split">
          <div className="dashboard-split__list">
            <div className="dashboard-list-heading">
              <h3 className="dashboard-list-heading__title">Inbox comenzi</h3>
              <div className="dashboard-list-heading__actions">
                <div className="dashboard-sort">
                  <button
                    type="button"
                    className={`dashboard-list-heading__icon-btn${sortKey !== 'date_desc' ? ' dashboard-list-heading__icon-btn--active' : ''}`}
                    aria-label="Sortează"
                    onClick={toggleSortOpen}
                  >
                    <ArrowDownWideNarrow aria-hidden="true" size={16} />
                  </button>
                  {sortOpen && (
                    <div className="dashboard-sort-menu">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={`dashboard-sort-menu__item${sortKey === option.key ? ' dashboard-sort-menu__item--active' : ''}`}
                          onClick={() => {
                            setSortKey(option.key)
                            setSortOpen(false)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`dashboard-list-heading__icon-btn${hasActiveFilters ? ' dashboard-list-heading__icon-btn--active' : ''}`}
                  aria-label="Filtrează"
                  onClick={toggleFilterOpen}
                >
                  <Filter aria-hidden="true" size={16} />
                </button>
              </div>
            </div>
            <div className="emails-page__header-controls">
              <div className="emails-search">
                <input
                  type="text"
                  placeholder="Caută după expeditor sau subiect..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
                <Search aria-hidden="true" size={16} />
              </div>
              <div className="dashboard-filter">
                <button
                  type="button"
                  className={`emails-filter-button${hasActiveFilters ? ' emails-filter-button--active' : ''}`}
                  onClick={toggleFilterOpen}
                >
                  <SlidersHorizontal aria-hidden="true" size={16} />
                  Filtrează
                </button>
                {filterOpen && (
                  <div className="dashboard-filter-panel">
                    <label className="dashboard-filter-panel__checkbox">
                      <input
                        type="checkbox"
                        checked={filterHasAttachments}
                        onChange={(event) => setFilterHasAttachments(event.target.checked)}
                      />
                      Are atașamente
                    </label>
                    <label className="dashboard-filter-panel__checkbox">
                      <input
                        type="checkbox"
                        checked={filterIsPriority}
                        onChange={(event) => setFilterIsPriority(event.target.checked)}
                      />
                      Prioritare
                    </label>
                    <label className="dashboard-filter-panel__field">
                      Încredere extragere minimă
                      <select
                        value={filterMinConfidence}
                        onChange={(event) => setFilterMinConfidence(event.target.value as ConfidenceFilter)}
                      >
                        <option value="all">Toate</option>
                        <option value="0.8">≥ 80%</option>
                        <option value="0.5">≥ 50%</option>
                      </select>
                    </label>
                    <label className="dashboard-filter-panel__field">
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
                    {hasActiveFilters && (
                      <button type="button" className="dashboard-filter-panel__reset" onClick={resetFilters}>
                        Resetează filtrele
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <nav className="emails-tabs">
              <button
                type="button"
                className={`emails-tabs__tab${activeTab === 'all' ? ' emails-tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Toate {summary.total}
              </button>
              <button
                type="button"
                className={`emails-tabs__tab${activeTab === 'needs_validation' ? ' emails-tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('needs_validation')}
              >
                Necesită validare {summary.needsValidation}
              </button>
              <button
                type="button"
                className={`emails-tabs__tab${activeTab === 'imported' ? ' emails-tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('imported')}
              >
                Importate {summary.imported}
              </button>
            </nav>

            <div className="dashboard-split__list-scroll">
              <EmailList
                emails={pagedEmails}
                selectedId={selectedEmail?.id ?? null}
                onSelect={setSelectedEmailId}
                favoriteIds={favoriteEmailIds}
                onToggleFavorite={toggleFavorite}
                showDate
              />
            </div>

            <ListFooter
              dataUpdatedAt={dataUpdatedAt}
              rangeStart={pageStart + 1}
              rangeEnd={Math.min(pageStart + PAGE_SIZE, visibleEmails.length)}
              total={visibleEmails.length}
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevPage={() => setPage(currentPage - 1)}
              onNextPage={() => setPage(currentPage + 1)}
              onRefresh={() => refetch()}
              isRefreshing={isFetching}
            />
          </div>
          <div className="dashboard-split__detail">
            {selectedEmail && (
              <DashboardDetailPanel
                email={selectedEmail}
                isFavorite={favoriteEmailIds.has(selectedEmail.id)}
                onToggleFavorite={() => toggleFavorite(selectedEmail.id)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
