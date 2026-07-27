import { useMemo } from 'react'
import { Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { formatEmailStatus } from '../lib/emails/format'
import { formatOrderStatus } from '../lib/orders/format'
import { useSubmissionJobsQuery } from '../lib/reports/useSubmissionJobsQuery'
import { formatSubmissionStatus } from '../lib/reports/format'

const EMAIL_STATUSES = ['new', 'queued', 'processing', 'extracted', 'needs_validation', 'rejected', 'archived']
const ORDER_STATUSES = [
  'draft',
  'needs_validation',
  'ready_to_import',
  'importing',
  'imported',
  'import_failed',
  'rejected',
]
const SUBMISSION_STATUSES = ['pending', 'sent', 'succeeded', 'failed']

function countByStatus<T extends string>(items: { status: string }[], statuses: T[]): Record<T, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<T, number>
  for (const item of items) {
    if (item.status in counts) counts[item.status as T] += 1
  }
  return counts
}

export function ReportsPage() {
  const emailsQuery = useEmailsQuery()
  const submissionJobsQuery = useSubmissionJobsQuery()

  const emails = useMemo(() => emailsQuery.data ?? [], [emailsQuery.data])
  const orders = useMemo(() => emails.flatMap((email) => email.orders), [emails])
  const submissionJobs = useMemo(() => submissionJobsQuery.data ?? [], [submissionJobsQuery.data])

  const emailStatusCounts = useMemo(() => countByStatus(emails, EMAIL_STATUSES), [emails])
  const orderStatusCounts = useMemo(() => countByStatus(orders, ORDER_STATUSES), [orders])
  const submissionStatusCounts = useMemo(
    () => countByStatus(submissionJobs, SUBMISSION_STATUSES),
    [submissionJobs],
  )

  const averageConfidence = useMemo(() => {
    const values = orders
      .map((order) => order.confidence_overall)
      .filter((value): value is number => value !== null)
    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [orders])

  const submissionSuccessRate = useMemo(() => {
    const succeeded = submissionStatusCounts.succeeded
    const failed = submissionStatusCounts.failed
    const terminal = succeeded + failed
    if (terminal === 0) return null
    return succeeded / terminal
  }, [submissionStatusCounts])

  const isLoading = emailsQuery.isLoading || submissionJobsQuery.isLoading
  const isError = emailsQuery.isError || submissionJobsQuery.isError
  const error = emailsQuery.error ?? submissionJobsQuery.error

  return (
    <div>
      <h1>Rapoarte</h1>

      {isLoading && (
        <p>
          <Loader2 aria-hidden="true" size={16} /> Se încarcă rapoartele...
        </p>
      )}

      {isError && (
        <p>
          <TriangleAlert aria-hidden="true" size={16} /> Rapoartele nu au putut fi încărcate
          {error instanceof Error ? `: ${error.message}` : '.'}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          emailsQuery.refetch()
          submissionJobsQuery.refetch()
        }}
      >
        <RefreshCw aria-hidden="true" size={16} />
        Reîmprospătează
      </button>

      {!isLoading && !isError && (
        <>
          <section>
            <h2>Emailuri pe status</h2>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Număr</th>
                </tr>
              </thead>
              <tbody>
                {EMAIL_STATUSES.map((status) => (
                  <tr key={status}>
                    <td>{formatEmailStatus(status)}</td>
                    <td>{emailStatusCounts[status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Comenzi pe status</h2>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Număr</th>
                </tr>
              </thead>
              <tbody>
                {ORDER_STATUSES.map((status) => (
                  <tr key={status}>
                    <td>{formatOrderStatus(status)}</td>
                    <td>{orderStatusCounts[status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Încredere medie extracție</h2>
            <p>{averageConfidence === null ? '—' : `${Math.round(averageConfidence * 100)}%`}</p>
          </section>

          <section>
            <h2>Trimiteri pe status</h2>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Număr</th>
                </tr>
              </thead>
              <tbody>
                {SUBMISSION_STATUSES.map((status) => (
                  <tr key={status}>
                    <td>{formatSubmissionStatus(status)}</td>
                    <td>{submissionStatusCounts[status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Rată de succes</h2>
            <p>{submissionSuccessRate === null ? '—' : `${Math.round(submissionSuccessRate * 100)}%`}</p>
          </section>
        </>
      )}
    </div>
  )
}
