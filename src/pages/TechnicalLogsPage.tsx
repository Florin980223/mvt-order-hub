import { Loader2, TriangleAlert } from 'lucide-react'
import { formatDateTime } from '../lib/emails/format'
import { formatSubmissionStatus } from '../lib/reports/format'
import {
  useEmailIngestQueueLogQuery,
  useExtractionJobsLogQuery,
  useSubmissionJobsLogQuery,
} from '../lib/technicalLogs/useTechnicalLogsQuery'

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
    <div>
      <h1>Jurnal tehnic</h1>

      <section>
        <h2>Joburi de extragere</h2>

        {extractionJobsQuery.isLoading && (
          <p>
            <Loader2 aria-hidden="true" size={16} /> Se încarcă...
          </p>
        )}
        {extractionJobsQuery.isError && (
          <p>
            <TriangleAlert aria-hidden="true" size={16} /> Nu au putut fi încărcate
            {extractionJobsQuery.error instanceof Error ? `: ${extractionJobsQuery.error.message}` : '.'}
          </p>
        )}
        {!extractionJobsQuery.isLoading && !extractionJobsQuery.isError && (
          <table>
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
                  <td>{EXTRACTION_JOB_STATUS_LABELS[job.status] ?? job.status}</td>
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
      </section>

      <section>
        <h2>Coadă preluare email</h2>

        {emailQueueQuery.isLoading && (
          <p>
            <Loader2 aria-hidden="true" size={16} /> Se încarcă...
          </p>
        )}
        {emailQueueQuery.isError && (
          <p>
            <TriangleAlert aria-hidden="true" size={16} /> Nu au putut fi încărcate
            {emailQueueQuery.error instanceof Error ? `: ${emailQueueQuery.error.message}` : '.'}
          </p>
        )}
        {!emailQueueQuery.isLoading && !emailQueueQuery.isError && (
          <table>
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
                  <td>{EMAIL_INGEST_QUEUE_STATUS_LABELS[row.status] ?? row.status}</td>
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
      </section>

      <section>
        <h2>Trimiteri AscendTMS</h2>

        {submissionJobsQuery.isLoading && (
          <p>
            <Loader2 aria-hidden="true" size={16} /> Se încarcă...
          </p>
        )}
        {submissionJobsQuery.isError && (
          <p>
            <TriangleAlert aria-hidden="true" size={16} /> Nu au putut fi încărcate
            {submissionJobsQuery.error instanceof Error ? `: ${submissionJobsQuery.error.message}` : '.'}
          </p>
        )}
        {!submissionJobsQuery.isLoading && !submissionJobsQuery.isError && (
          <table>
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
                  <td>{formatSubmissionStatus(job.status)}</td>
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
      </section>
    </div>
  )
}
