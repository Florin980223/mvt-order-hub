import { useEffect, useMemo, useRef, useState } from 'react'
import { Inbox, Loader2, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { EmailDetailPanel } from '../components/emails/EmailDetailPanel'
import { EmailList } from '../components/emails/EmailList'
import { ListFooter } from '../components/emails/ListFooter'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { matchesSearch } from '../lib/emails/search'
import type { EmailRow } from '../lib/emails/types'
import './EmailsPage.css'

const PAGE_SIZE = 6

type TabKey = 'all' | 'needs_validation' | 'with_attachments' | 'priority'

type ConfidenceFilter = 'all' | '0.8' | '0.5'

// Average of the email's orders' confidence_overall — null when the email
// has no orders (or none with a score) yet, so it always fails a minimum-
// confidence filter rather than being treated as 0%. Mirrors DashboardPage's
// own emailConfidence (not exported from there, so duplicated locally here
// rather than reaching into a Dashboard-owned module).
function emailConfidence(email: EmailRow): number | null {
  const values = email.orders.map((order) => order.confidence_overall).filter((value): value is number => value !== null)
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function EmailsPage() {
  const { data, dataUpdatedAt, isLoading, isError, error, refetch, isFetching } = useEmailsQuery()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [favoriteEmailIds, setFavoriteEmailIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  // Same interaction pattern as DashboardPage's filter panel (state, panel
  // toggle, active-state styling, "Resetează filtrele") — fields here are
  // confidence/carrier since attachments/priority are already tab-covered
  // on this page (Dashboard has no such tabs, hence its extra checkboxes).
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterMinConfidence, setFilterMinConfidence] = useState<ConfidenceFilter>('all')
  const [filterCarrier, setFilterCarrier] = useState('all')

  // Outside-click-to-close for the filter popover — same useRef+useEffect+
  // mousedown pattern as DashboardPage's own sort/filter panels
  // (DashboardPage.tsx). Only one ref is needed here (unlike Dashboard's
  // filterWrapperRef+filterIconBtnRef pair): this page has a single
  // "Filtrează" trigger, not a second standalone icon-button trigger
  // outside the panel's own DOM subtree, so wrapping trigger+panel together
  // is enough for the containment check to leave the trigger's own onClick
  // toggle alone.
  const filterWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(event.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen])

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

  const hasActiveFilters = filterMinConfidence !== 'all' || filterCarrier !== 'all'

  function resetFilters() {
    setFilterMinConfidence('all')
    setFilterCarrier('all')
  }

  function toggleFilterOpen() {
    setFilterOpen((open) => !open)
  }

  const counts = useMemo(
    () => ({
      all: emails.length,
      needsValidation: emails.filter((email) => email.status === 'needs_validation').length,
      withAttachments: emails.filter((email) => email.email_attachments.length > 0).length,
      priority: emails.filter((email) => email.orders.some((order) => order.is_priority)).length,
    }),
    [emails],
  )

  const visibleEmails = useMemo(() => {
    const byTab = emails.filter((email) => {
      if (activeTab === 'needs_validation') return email.status === 'needs_validation'
      if (activeTab === 'with_attachments') return email.email_attachments.length > 0
      if (activeTab === 'priority') return email.orders.some((order) => order.is_priority)
      return true
    })
    return byTab.filter((email) => {
      if (!matchesSearch(email, searchText)) return false
      if (filterMinConfidence !== 'all') {
        const threshold = filterMinConfidence === '0.8' ? 0.8 : 0.5
        const confidence = emailConfidence(email)
        if (confidence === null || confidence < threshold) return false
      }
      if (filterCarrier !== 'all' && !email.orders.some((order) => order.carrier_proposed === filterCarrier)) return false
      return true
    })
  }, [emails, activeTab, searchText, filterMinConfidence, filterCarrier])

  // Clamped rather than reset via effect, same pattern as DashboardPage.
  const totalPages = Math.max(1, Math.ceil(visibleEmails.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageStart = currentPage * PAGE_SIZE
  const pagedEmails = visibleEmails.slice(pageStart, pageStart + PAGE_SIZE)

  // Derived rather than effect-driven: defaults to the first email until the
  // user clicks a different row, with no synchronous setState-in-effect step.
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
    <div className="emails-page">
      {isLoading && (
        <div className="emails-state emails-state--loading">
          <Loader2 aria-hidden="true" size={24} className="emails-state__spinner" />
          <p>Se încarcă emailurile...</p>
        </div>
      )}

      {isError && (
        <div className="emails-state emails-state--error">
          <TriangleAlert aria-hidden="true" size={24} />
          <p>Emailurile nu au putut fi încărcate{error instanceof Error ? `: ${error.message}` : '.'}</p>
          <button type="button" onClick={() => refetch()}>
            <RefreshCw aria-hidden="true" size={16} />
            Reîncearcă
          </button>
        </div>
      )}

      {!isLoading && !isError && emails.length === 0 && (
        <div className="emails-state emails-state--empty">
          <Inbox aria-hidden="true" size={24} />
          <p>Nu există emailuri noi.</p>
        </div>
      )}

      {!isLoading && !isError && emails.length > 0 && (
        <div className="emails-split">
          <div className="emails-split__list">
            <div className="emails-list-heading">
              <h3 className="emails-list-heading__title">Emailuri noi</h3>
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
              <div className="emails-filter" ref={filterWrapperRef}>
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
                    {hasActiveFilters && (
                      <button type="button" className="emails-filter-panel__reset" onClick={resetFilters}>
                        Resetează filtrele
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Colored pill count badges — sampled at native resolution against
                figura2-emailuri-noi.png, same "badge instead of trailing tab
                text" treatment Dashboard's tabs got (dashboard-tab-count,
                DashboardPage.css), but with this page's own colors: Toate/Cu
                atașamente sample as blue, Necesită validare as amber/gold,
                Prioritare as red — not the blue/orange/green set Dashboard's
                own figura1 sampled, since the two mockups use independently
                chosen badge colors per tab rather than a shared palette. */}
            <nav className="emails-tabs">
              <button
                type="button"
                className={`emails-tabs__tab${activeTab === 'all' ? ' emails-tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                Toate
                <span className="emails-tab-count emails-tab-count--blue">{counts.all}</span>
              </button>
              <button
                type="button"
                className={`emails-tabs__tab${activeTab === 'needs_validation' ? ' emails-tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('needs_validation')}
              >
                Necesită validare
                <span className="emails-tab-count emails-tab-count--amber">{counts.needsValidation}</span>
              </button>
              <button
                type="button"
                className={`emails-tabs__tab${activeTab === 'with_attachments' ? ' emails-tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('with_attachments')}
              >
                Cu atașamente
                <span className="emails-tab-count emails-tab-count--blue">{counts.withAttachments}</span>
              </button>
              <button
                type="button"
                className={`emails-tabs__tab${activeTab === 'priority' ? ' emails-tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('priority')}
              >
                Prioritare
                <span className="emails-tab-count emails-tab-count--red">{counts.priority}</span>
              </button>
            </nav>

            <div className="emails-split__list-scroll">
              <EmailList
                emails={pagedEmails}
                selectedId={selectedEmail?.id ?? null}
                onSelect={setSelectedEmailId}
                favoriteIds={favoriteEmailIds}
                onToggleFavorite={toggleFavorite}
                starVisibility="selected"
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
          <div className="emails-split__detail">
            {selectedEmail ? (
              <EmailDetailPanel
                email={selectedEmail}
                isFavorite={favoriteEmailIds.has(selectedEmail.id)}
                onToggleFavorite={() => toggleFavorite(selectedEmail.id)}
              />
            ) : (
              <div className="emails-state emails-state--empty">
                <p>Selectează un email din listă.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
