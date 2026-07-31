import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, TriangleAlert } from 'lucide-react'
import { formatDateTime } from '../lib/emails/format'
import { formatSubmissionStatus } from '../lib/reports/format'
import {
  useEmailIngestQueueLogQuery,
  useExtractionJobsLogQuery,
  useSubmissionJobsLogQuery,
} from '../lib/technicalLogs/useTechnicalLogsQuery'
// .settings-card/.settings-users-table/.settings-inline-state (SettingsPage.css)
// and .users-page__back/__header/__subtitle (UsersPage.css) — reused here
// rather than duplicated, same pattern UsersPage.tsx already established
// for this exact class set. This page had no styling at all before (raw
// <table>s); no figura mockup covers it (not part of the brief's 6-page
// spec), so it borrows the app's existing card/table language rather than
// inventing a new one, per "putin design, nu ceva complicat".
import './SettingsPage.css'
import './UsersPage.css'
import './TechnicalLogsPage.css'

type LogTone = 'neutral' | 'blue' | 'amber' | 'green' | 'red'

const EXTRACTION_JOB_STATUS_TONES: Record<string, LogTone> = {
  pending: 'amber',
  running: 'blue',
  succeeded: 'green',
  failed: 'red',
}

const EMAIL_INGEST_QUEUE_STATUS_TONES: Record<string, LogTone> = {
  pending: 'amber',
  processing: 'blue',
  done: 'green',
  failed: 'red',
}

const SUBMISSION_STATUS_TONES: Record<string, LogTone> = {
  pending: 'amber',
  sent: 'blue',
  succeeded: 'green',
  failed: 'red',
}

function LogStatusBadge({ status, label, tones }: { status: string; label: string; tones: Record<string, LogTone> }) {
  const tone = tones[status] ?? 'neutral'
  return <span className={`emails-status-badge emails-status-badge--${tone}`}>{label}</span>
}

const EXTRACTION_JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'În așteptare',
  running: 'În execuție',
  succeeded: 'Reușit',
  failed: 'Eșuat',
}

const EMAIL_INGEST_QUEUE_STATUS_LABELS: Record<string, string> = {
  pending: 'În așteptare',
  processing: 'În procesare',
  done: 'Finalizat',
  failed: 'Eșuat',
}

function ErrorCell({ hasError, detail }: { hasError: boolean; detail: string | null }) {
  if (!hasError) return <>—</>
  // detail is null for a non-admin session (redacted server-side by the
  // *_log view) even though has_error is true — show the boolean signal only.
  return <span title={detail ?? undefined}>{detail ?? 'Da'}</span>
}

export function TechnicalLogsPage() {
  const extractionJobsQuery = useExtractionJobsLogQuery()
  const emailQueueQuery = useEmailIngestQueueLogQuery()
  const submissionJobsQuery = useSubmissionJobsLogQuery()

  return (
    <div className="users-page">
      <Link to="/settings" className="users-page__back">
        <ArrowLeft aria-hidden="true" size={16} />
        Înapoi la Setări
      </Link>
      <header className="users-page__header">
        <h1>Jurnal tehnic</h1>
        <p className="users-page__subtitle">Istoricul joburilor de extragere, al cozii de preluare email și al trimiterilor către AscendTMS.</p>
      </header>

      <section className="settings-card technical-logs__card">
        <h2>Joburi de extragere</h2>

        {extractionJobsQuery.isLoading && (
          <p className="settings-inline-state">
            <Loader2 aria-hidden="true" size={14} className="settings-inline-state__spinner" /> Se încarcă...
          </p>
        )}
        {extractionJobsQuery.isError && (
          <p className="settings-inline-state settings-inline-state--error">
            <TriangleAlert aria-hidden="true" size={14} /> Nu au putut fi încărcate
            {extractionJobsQuery.error instanceof Error ? `: ${extractionJobsQuery.error.message}` : '.'}
          </p>
        )}
        {!extractionJobsQuery.isLoading && !extractionJobsQuery.isError && (
          <>
            {(extractionJobsQuery.data ?? []).length === 0 ? (
              <p className="technical-logs__empty">Niciun job de extragere înregistrat.</p>
            ) : (
              <table className="settings-users-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Încercări</th>
                    <th>Creat</th>
                    <th>Finalizat</th>
                    <th>Eroare</th>
                  </tr>
                </thead>
                <tbody>
                  {(extractionJobsQuery.data ?? []).map((job) => (
                    <tr key={job.id}>
                      <td>
                        <LogStatusBadge
                          status={job.status}
                          label={EXTRACTION_JOB_STATUS_LABELS[job.status] ?? job.status}
                          tones={EXTRACTION_JOB_STATUS_TONES}
                        />
                      </td>
                      <td>{job.attempts}</td>
                      <td>{formatDateTime(job.created_at)}</td>
                      <td>{job.finished_at ? formatDateTime(job.finished_at) : '—'}</td>
                      <td>
                        <ErrorCell hasError={job.has_error} detail={job.error} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>

      <section className="settings-card technical-logs__card">
        <h2>Coadă preluare email</h2>

        {emailQueueQuery.isLoading && (
          <p className="settings-inline-state">
            <Loader2 aria-hidden="true" size={14} className="settings-inline-state__spinner" /> Se încarcă...
          </p>
        )}
        {emailQueueQuery.isError && (
          <p className="settings-inline-state settings-inline-state--error">
            <TriangleAlert aria-hidden="true" size={14} /> Nu au putut fi încărcate
            {emailQueueQuery.error instanceof Error ? `: ${emailQueueQuery.error.message}` : '.'}
          </p>
        )}
        {!emailQueueQuery.isLoading && !emailQueueQuery.isError && (
          <>
            {(emailQueueQuery.data ?? []).length === 0 ? (
              <p className="technical-logs__empty">Nicio intrare în coada de preluare email.</p>
            ) : (
              <table className="settings-users-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Încercări</th>
                    <th>Creat</th>
                    <th>Actualizat</th>
                    <th>Eroare</th>
                  </tr>
                </thead>
                <tbody>
                  {(emailQueueQuery.data ?? []).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <LogStatusBadge
                          status={row.status}
                          label={EMAIL_INGEST_QUEUE_STATUS_LABELS[row.status] ?? row.status}
                          tones={EMAIL_INGEST_QUEUE_STATUS_TONES}
                        />
                      </td>
                      <td>{row.attempts}</td>
                      <td>{formatDateTime(row.created_at)}</td>
                      <td>{formatDateTime(row.updated_at)}</td>
                      <td>
                        <ErrorCell hasError={row.has_error} detail={row.last_error} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>

      <section className="settings-card technical-logs__card">
        <h2>Trimiteri AscendTMS</h2>

        {submissionJobsQuery.isLoading && (
          <p className="settings-inline-state">
            <Loader2 aria-hidden="true" size={14} className="settings-inline-state__spinner" /> Se încarcă...
          </p>
        )}
        {submissionJobsQuery.isError && (
          <p className="settings-inline-state settings-inline-state--error">
            <TriangleAlert aria-hidden="true" size={14} /> Nu au putut fi încărcate
            {submissionJobsQuery.error instanceof Error ? `: ${submissionJobsQuery.error.message}` : '.'}
          </p>
        )}
        {!submissionJobsQuery.isLoading && !submissionJobsQuery.isError && (
          <>
            {(submissionJobsQuery.data ?? []).length === 0 ? (
              <p className="technical-logs__empty">Nicio trimitere AscendTMS înregistrată.</p>
            ) : (
              <table className="settings-users-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>ID extern</th>
                    <th>Creat</th>
                    <th>Actualizat</th>
                    <th>Eroare</th>
                  </tr>
                </thead>
                <tbody>
                  {(submissionJobsQuery.data ?? []).map((job) => (
                    <tr key={job.id}>
                      <td>
                        <LogStatusBadge status={job.status} label={formatSubmissionStatus(job.status)} tones={SUBMISSION_STATUS_TONES} />
                      </td>
                      <td>{job.external_id ?? '—'}</td>
                      <td>{formatDateTime(job.created_at)}</td>
                      <td>{formatDateTime(job.updated_at)}</td>
                      <td>
                        <ErrorCell hasError={job.has_error} detail={job.error} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </div>
  )
}
