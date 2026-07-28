import { useMemo, useState } from 'react'
import { Inbox, Loader2, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { EmailDetailPanel } from '../components/emails/EmailDetailPanel'
import { EmailList } from '../components/emails/EmailList'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { matchesSearch } from '../lib/emails/search'
import './EmailsPage.css'

type TabKey = 'all' | 'needs_validation' | 'with_attachments'

export function EmailsPage() {
  const { data, isLoading, isError, error, refetch } = useEmailsQuery()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)

  const emails = useMemo(() => data ?? [], [data])

  const counts = useMemo(
    () => ({
      all: emails.length,
      needsValidation: emails.filter((email) => email.status === 'needs_validation').length,
      withAttachments: emails.filter((email) => email.email_attachments.length > 0).length,
    }),
    [emails],
  )

  const visibleEmails = useMemo(() => {
    const byTab = emails.filter((email) => {
      if (activeTab === 'needs_validation') return email.status === 'needs_validation'
      if (activeTab === 'with_attachments') return email.email_attachments.length > 0
      return true
    })
    return byTab.filter((email) => matchesSearch(email, searchText))
  }, [emails, activeTab, searchText])

  // Derived rather than effect-driven: defaults to the first email until the
  // user clicks a different row, with no synchronous setState-in-effect step.
  const selectedEmail = emails.find((email) => email.id === selectedEmailId) ?? emails[0] ?? null

  return (
    <div className="emails-page">
      <header className="emails-page__header">
        <h1>Emailuri noi</h1>
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
      </header>

      <nav className="emails-tabs">
        <button
          type="button"
          className={`emails-tabs__tab${activeTab === 'all' ? ' emails-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Toate ({counts.all})
        </button>
        <button
          type="button"
          className={`emails-tabs__tab${activeTab === 'needs_validation' ? ' emails-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('needs_validation')}
        >
          Necesită validare ({counts.needsValidation})
        </button>
        <button
          type="button"
          className={`emails-tabs__tab${activeTab === 'with_attachments' ? ' emails-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('with_attachments')}
        >
          Cu atașamente ({counts.withAttachments})
        </button>
      </nav>

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
            <EmailList emails={visibleEmails} selectedId={selectedEmail?.id ?? null} onSelect={setSelectedEmailId} />
          </div>
          <div className="emails-split__detail">
            {selectedEmail ? (
              <EmailDetailPanel email={selectedEmail} />
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
