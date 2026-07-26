import { useMemo, useState } from 'react'
import { Inbox, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { DashboardDetailPanel } from '../components/dashboard/DashboardDetailPanel'
import { SummaryTiles } from '../components/dashboard/SummaryTiles'
import { EmailList } from '../components/emails/EmailList'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
// EmailList/ActionBar/ConfidenceBadge styles live in EmailsPage.css, and
// PendingOrderTopBar/PendingOrderFields/PendingOrderAttachments (reused via
// DashboardDetailPanel) live in PendingOrdersPage.css — neither is
// colocated with its component, so both are imported here directly.
import './EmailsPage.css'
import './PendingOrdersPage.css'
import './DashboardPage.css'

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useEmailsQuery()
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)

  const emails = useMemo(() => data ?? [], [data])

  const summary = useMemo(() => {
    const total = emails.length
    const needsValidation = emails.filter((email) => email.status === 'needs_validation').length
    const imported = emails.flatMap((email) => email.orders).filter((order) => order.status === 'imported').length
    return { total, needsValidation, imported }
  }, [emails])

  // Derived rather than effect-driven, same pattern as EmailsPage/PendingOrdersPage.
  const selectedEmail = emails.find((email) => email.id === selectedEmailId) ?? emails[0] ?? null

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <h1>Dashboard</h1>
      </header>

      <SummaryTiles total={summary.total} needsValidation={summary.needsValidation} imported={summary.imported} />

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
            <EmailList emails={emails} selectedId={selectedEmail?.id ?? null} onSelect={setSelectedEmailId} />
          </div>
          <div className="dashboard-split__detail">
            {selectedEmail && <DashboardDetailPanel email={selectedEmail} />}
          </div>
        </div>
      )}
    </div>
  )
}
