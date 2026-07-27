import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { formatEmailStatus } from '../lib/emails/format'
import { formatOrderStatus } from '../lib/orders/format'
import { useSubmissionJobsQuery } from '../lib/reports/useSubmissionJobsQuery'
import { formatSubmissionStatus } from '../lib/reports/format'
import { supabase } from '../lib/supabaseClient'

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

const DAY_MS = 24 * 60 * 60 * 1000

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function countByStatus<T extends string>(items: { status: string }[], statuses: T[]): Record<T, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<T, number>
  for (const item of items) {
    if (item.status in counts) counts[item.status as T] += 1
  }
  return counts
}

/** Compares only the date portion — inclusive on both ends of a day-granularity picker. */
function isWithinDateRange(isoTimestamp: string, fromDate: string, toDate: string): boolean {
  const day = isoTimestamp.slice(0, 10)
  return day >= fromDate && day <= toDate
}

export function ReportsPage() {
  const emailsQuery = useEmailsQuery()
  const submissionJobsQuery = useSubmissionJobsQuery()

  const [fromDate, setFromDate] = useState(() => toDateInputValue(new Date(Date.now() - 30 * DAY_MS)))
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()))

  const exportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<string>('generate-report', {
        body: { from: `${fromDate}T00:00:00.000Z`, to: `${toDate}T23:59:59.999Z` },
      })
      if (error) throw error
      if (!data) throw new Error('niciun fișier CSV returnat')
      return data
    },
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `raport-${fromDate}-${toDate}.csv`
      link.click()
      URL.revokeObjectURL(url)
    },
  })

  const allEmails = useMemo(() => emailsQuery.data ?? [], [emailsQuery.data])
  const allSubmissionJobs = useMemo(() => submissionJobsQuery.data ?? [], [submissionJobsQuery.data])

  const emails = useMemo(
    () => allEmails.filter((email) => isWithinDateRange(email.received_at, fromDate, toDate)),
    [allEmails, fromDate, toDate],
  )
  const orders = useMemo(() => emails.flatMap((email) => email.orders), [emails])
  const submissionJobs = useMemo(
    () => allSubmissionJobs.filter((job) => isWithinDateRange(job.created_at, fromDate, toDate)),
    [allSubmissionJobs, fromDate, toDate],
  )

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

      <div>
        <label>
          De la
          <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          Până la
          <input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
      </div>

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

      <button type="button" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
        <Download aria-hidden="true" size={16} />
        {exportMutation.isPending ? 'Se exportă...' : 'Exportă CSV'}
      </button>

      {exportMutation.isError && (
        <p role="alert">
          {exportMutation.error instanceof Error ? exportMutation.error.message : 'Exportul CSV a eșuat.'}
        </p>
      )}

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
