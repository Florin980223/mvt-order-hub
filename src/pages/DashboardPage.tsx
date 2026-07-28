import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, Filter, Inbox, Loader2, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { DashboardDetailPanel } from '../components/dashboard/DashboardDetailPanel'
import { EmailList } from '../components/emails/EmailList'
import { ListFooter } from '../components/emails/ListFooter'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { matchesSearch } from '../lib/emails/search'

const PAGE_SIZE = 6
// EmailList/ActionBar/ConfidenceBadge styles live in EmailsPage.css, and
// PendingOrderTopBar/PendingOrderFields/PendingOrderAttachments (reused via
// DashboardDetailPanel) live in PendingOrdersPage.css — neither is
// colocated with its component, so both are imported here directly.
import './EmailsPage.css'
import './PendingOrdersPage.css'
import './DashboardPage.css'

type TabKey = 'all' | 'needs_validation' | 'imported'

export function DashboardPage() {
  const { data, dataUpdatedAt, isLoading, isError, error, refetch } = useEmailsQuery()
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchText, setSearchText] = useState('')
  const [favoriteEmailIds, setFavoriteEmailIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  const emails = useMemo(() => data ?? [], [data])

  const summary = useMemo(() => {
    const total = emails.length
    const needsValidation = emails.filter((email) => email.status === 'needs_validation').length
    const imported = emails.flatMap((email) => email.orders).filter((order) => order.status === 'imported').length
    return { total, needsValidation, imported }
  }, [emails])

  const visibleEmails = useMemo(() => {
    const byTab = emails.filter((email) => {
      if (activeTab === 'needs_validation') return email.status === 'needs_validation'
      if (activeTab === 'imported') return email.orders.some((order) => order.status === 'imported')
      return true
    })
    return byTab.filter((email) => matchesSearch(email, searchText))
  }, [emails, activeTab, searchText])

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
                <button type="button" className="dashboard-list-heading__icon-btn" aria-label="Sortează">
                  <ArrowDownWideNarrow aria-hidden="true" size={16} />
                </button>
                <button type="button" className="dashboard-list-heading__icon-btn" aria-label="Filtrează">
                  <Filter aria-hidden="true" size={16} />
                </button>
              </div>
            </div>
            <div className="emails-page__header-controls">
              <div className="emails-search">
                <Search aria-hidden="true" size={16} />
                <input
                  type="text"
                  placeholder="Caută după expeditor sau subiect..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
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
