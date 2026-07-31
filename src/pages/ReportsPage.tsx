import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Box,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  Euro,
  FileText,
  Gauge,
  Inbox,
  Loader2,
  Mail,
  Package,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { KpiTile } from '../components/reports/KpiTile'
import { AreaLineChart } from '../components/reports/AreaLineChart'
import { StatusDonutChart } from '../components/reports/StatusDonutChart'
import { TopClientsList } from '../components/reports/TopClientsList'
import { ConfidenceGauge } from '../components/reports/ConfidenceGauge'
import { ProcessingTimeList } from '../components/reports/ProcessingTimeList'
import { ImportHistoryTable } from '../components/reports/ImportHistoryTable'
import { ExportReportsCard } from '../components/reports/ExportReportsCard'
import { useEmailsQuery } from '../lib/emails/useEmailsQuery'
import { useSubmissionJobsQuery } from '../lib/reports/useSubmissionJobsQuery'
import { formatCurrency, formatNumber } from '../lib/reports/format'
import { supabase } from '../lib/supabaseClient'
import {
  DAY_MS,
  averageDurationSeconds,
  averageImportDuration,
  bucketByConfidence,
  bucketByDay,
  bucketDailyPerformance,
  computeTrend,
  countByStatus,
  isWithinDateRange,
  previousPeriodRange,
  toDateInputValue,
  topClientsByOrderCount,
} from '../lib/reports/aggregations'
import './ReportsPage.css'

const SUBMISSION_STATUSES = ['pending', 'sent', 'succeeded', 'failed'] as const
const HISTORY_ROW_COUNT = 5

// figura5-rapoarte.png's own colors, confirmed at native resolution — gray
// and purple have no existing token anywhere in this app (index.css only
// defines success/warning/error/primary), so these two are new, scoped to
// this page only, matching the approved mockup rather than inventing an
// arbitrary palette.
const STATUS_COLORS = {
  imported: '#16a34a',
  pending: '#f59e0b',
  followUp: '#dc2626',
  rejected: '#9ca3af',
  error: '#7c3aed',
}
const CONFIDENCE_COLORS = ['#16a34a', '#f59e0b', '#dc2626']

export function ReportsPage() {
  const emailsQuery = useEmailsQuery()
  const submissionJobsQuery = useSubmissionJobsQuery()

  const [fromDate, setFromDate] = useState(() => toDateInputValue(new Date(Date.now() - 30 * DAY_MS)))
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()))

  const exportCsvMutation = useMutation({
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

  const { from: prevFromDate, to: prevToDate } = useMemo(
    () => previousPeriodRange(fromDate, toDate),
    [fromDate, toDate],
  )

  const emails = useMemo(
    () => allEmails.filter((email) => isWithinDateRange(email.received_at, fromDate, toDate)),
    [allEmails, fromDate, toDate],
  )
  const prevEmails = useMemo(
    () => allEmails.filter((email) => isWithinDateRange(email.received_at, prevFromDate, prevToDate)),
    [allEmails, prevFromDate, prevToDate],
  )

  const orders = useMemo(() => emails.flatMap((email) => email.orders), [emails])
  const prevOrders = useMemo(() => prevEmails.flatMap((email) => email.orders), [prevEmails])

  const submissionJobs = useMemo(
    () => allSubmissionJobs.filter((job) => isWithinDateRange(job.created_at, fromDate, toDate)),
    [allSubmissionJobs, fromDate, toDate],
  )
  const prevSubmissionJobs = useMemo(
    () => allSubmissionJobs.filter((job) => isWithinDateRange(job.created_at, prevFromDate, prevToDate)),
    [allSubmissionJobs, prevFromDate, prevToDate],
  )

  function successRate(jobs: { status: string }[]): number | null {
    const counts = countByStatus(jobs, SUBMISSION_STATUSES)
    const terminal = counts.succeeded + counts.failed
    return terminal === 0 ? null : counts.succeeded / terminal
  }

  const importedCount = orders.filter((order) => order.status === 'imported').length
  const prevImportedCount = prevOrders.filter((order) => order.status === 'imported').length
  const needsValidationCount = orders.filter((order) => order.status === 'needs_validation').length
  const prevNeedsValidationCount = prevOrders.filter((order) => order.status === 'needs_validation').length
  const successRateNow = successRate(submissionJobs)
  const successRatePrev = successRate(prevSubmissionJobs)

  const averageConfidence = useMemo(() => {
    const values = orders.map((order) => order.confidence_overall).filter((value): value is number => value !== null)
    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [orders])

  const dailyEmails = useMemo(() => bucketByDay(emails, (email) => email.received_at, fromDate, toDate), [
    emails,
    fromDate,
    toDate,
  ])
  const dailyImported = useMemo(
    () =>
      bucketByDay(
        orders.filter((order) => order.status === 'imported'),
        (order) => order.imported_at,
        fromDate,
        toDate,
      ),
    [orders, fromDate, toDate],
  )

  const statusSegments = [
    { label: 'Importate', value: importedCount, color: STATUS_COLORS.imported },
    { label: 'În așteptare', value: needsValidationCount, color: STATUS_COLORS.pending },
    // No real signal anywhere in the schema for "needs follow-up" — same
    // conclusion as Phase 7e-1's SentOrdersPage tab, stubbed at 0.
    { label: 'Necesită follow-up', value: 0, color: STATUS_COLORS.followUp },
    { label: 'Respinse', value: orders.filter((order) => order.status === 'rejected').length, color: STATUS_COLORS.rejected },
    { label: 'Eroare procesare', value: orders.filter((order) => order.status === 'import_failed').length, color: STATUS_COLORS.error },
  ]

  const topClients = useMemo(() => topClientsByOrderCount(orders), [orders])

  function sum(values: (number | null)[]): number {
    return values.reduce<number>((total, value) => total + (value ?? 0), 0)
  }

  const totalWeight = sum(orders.map((order) => order.weight_kg))
  const prevTotalWeight = sum(prevOrders.map((order) => order.weight_kg))
  const totalVolume = sum(orders.map((order) => order.volume_m3))
  const prevTotalVolume = sum(prevOrders.map((order) => order.volume_m3))
  const totalValue = sum(orders.map((order) => order.transport_amount))
  const prevTotalValue = sum(prevOrders.map((order) => order.transport_amount))

  const confidenceBands = useMemo(() => bucketByConfidence(orders), [orders])

  // "Timp mediu procesare" — all 3 durations are real (schema-confirmed
  // during 7f-1 planning), not fabricated: emails.created_at vs
  // received_at for ingest lag, extraction_jobs.started_at/finished_at for
  // AI extraction, and orders.imported_at vs submission_jobs.created_at
  // (joined by order_id) for import duration — see averageImportDuration's
  // own comment for why submission_jobs.updated_at isn't used instead.
  const emailIngestSeconds = useMemo(
    () => averageDurationSeconds(emails.map((email) => ({ start: email.received_at, end: email.created_at }))),
    [emails],
  )
  const prevEmailIngestSeconds = useMemo(
    () => averageDurationSeconds(prevEmails.map((email) => ({ start: email.received_at, end: email.created_at }))),
    [prevEmails],
  )
  const aiExtractionSeconds = useMemo(
    () =>
      averageDurationSeconds(
        emails.flatMap((email) => email.extraction_jobs).map((job) => ({ start: job.started_at, end: job.finished_at })),
      ),
    [emails],
  )
  const prevAiExtractionSeconds = useMemo(
    () =>
      averageDurationSeconds(
        prevEmails.flatMap((email) => email.extraction_jobs).map((job) => ({ start: job.started_at, end: job.finished_at })),
      ),
    [prevEmails],
  )
  const importSeconds = useMemo(() => averageImportDuration(submissionJobs, orders), [submissionJobs, orders])
  const prevImportSeconds = useMemo(
    () => averageImportDuration(prevSubmissionJobs, prevOrders),
    [prevSubmissionJobs, prevOrders],
  )

  // "Istoric performanță import" — bucketed by the order's parent email's
  // received_at, same day-grouping concept as the "Comenzi procesate pe
  // zi" chart. figura5 shows only the 5 most recent days, not the whole
  // selected range — same "show first N" convention as PendingOrdersPage's
  // VISIBLE_TABLE_ROW_COUNT.
  const dailyPerformanceRows = useMemo(
    () =>
      bucketDailyPerformance(
        emails.flatMap((email) => email.orders.map((order) => ({ date: email.received_at, order }))),
        fromDate,
        toDate,
      ).slice(0, HISTORY_ROW_COUNT),
    [emails, fromDate, toDate],
  )

  const isLoading = emailsQuery.isLoading || submissionJobsQuery.isLoading
  const isError = emailsQuery.isError || submissionJobsQuery.isError
  const error = emailsQuery.error ?? submissionJobsQuery.error

  return (
    <div className="reports-page">
      <header className="reports-page__header">
        <div>
          <h1>Rapoarte</h1>
          <p className="reports-page__subtitle">
            Analize și statistici despre comenzile procesate și performanța operațională.
          </p>
        </div>

        <div className="reports-page__header-controls">
          <div className="reports-date-range">
            <Calendar aria-hidden="true" size={16} />
            <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} />
            <span>–</span>
            <input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} />
            <ChevronDown aria-hidden="true" size={14} className="reports-date-range__chevron" />
          </div>
          <button
            type="button"
            className="reports-route-filter"
            disabled
            title="Filtrarea după rută nu este încă disponibilă — nu există un câmp de rută/lanț în date, doar adrese text libere"
          >
            Toate rutele
            <ChevronDown aria-hidden="true" size={14} className="reports-route-filter__chevron" />
          </button>
          <button
            type="button"
            className="reports-export-btn"
            disabled={exportCsvMutation.isPending}
            onClick={() => exportCsvMutation.mutate()}
          >
            <Download aria-hidden="true" size={16} />
            {exportCsvMutation.isPending ? 'Se exportă...' : 'Exportă raport'}
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="reports-state reports-state--loading">
          <Loader2 aria-hidden="true" size={24} className="reports-state__spinner" />
          <p>Se încarcă rapoartele...</p>
        </div>
      )}

      {isError && (
        <div className="reports-state reports-state--error">
          <TriangleAlert aria-hidden="true" size={24} />
          <p>Rapoartele nu au putut fi încărcate{error instanceof Error ? `: ${error.message}` : '.'}</p>
        </div>
      )}

      {!isLoading && !isError && emails.length === 0 && (
        <div className="reports-state reports-state--empty">
          <Inbox aria-hidden="true" size={24} />
          <p>Niciun email în perioada selectată.</p>
        </div>
      )}

      {!isLoading && !isError && emails.length > 0 && (
        <>
          <div className="reports-kpi-row">
            <KpiTile
              icon={Mail}
              iconVariant="blue"
              label="Total emailuri procesate"
              value={formatNumber(emails.length)}
              trend={computeTrend(emails.length, prevEmails.length)}
            />
            <KpiTile
              icon={ClipboardList}
              iconVariant="green"
              label="Comenzi extrase"
              value={formatNumber(orders.length)}
              trend={computeTrend(orders.length, prevOrders.length)}
            />
            <KpiTile
              icon={Clock}
              iconVariant="amber"
              label="În așteptare validare"
              value={formatNumber(needsValidationCount)}
              trend={computeTrend(needsValidationCount, prevNeedsValidationCount)}
            />
            <KpiTile
              icon={CheckCircle2}
              iconVariant="green"
              label="Comenzi importate"
              value={formatNumber(importedCount)}
              trend={computeTrend(importedCount, prevImportedCount)}
            />
            <KpiTile
              icon={Gauge}
              iconVariant="blue"
              label="Rată import reușit"
              value={successRateNow === null ? '—' : `${(successRateNow * 100).toFixed(1).replace('.', ',')}%`}
              trend={
                successRateNow === null || successRatePrev === null
                  ? null
                  : computeTrend(successRateNow, successRatePrev)
              }
            />
          </div>

          <div className="reports-row-2">
            <section className="reports-card reports-card--chart">
              <div className="reports-card__header">
                <h2>Comenzi procesate pe zi</h2>
                <select className="reports-period-select" disabled defaultValue="daily">
                  <option value="daily">Zilnic</option>
                </select>
              </div>
              <div className="reports-chart-legend">
                <span className="reports-chart-legend__item">
                  <span className="reports-chart-legend__dot" style={{ background: '#0f5acd' }} /> Emailuri procesate
                </span>
                <span className="reports-chart-legend__item">
                  <span className="reports-chart-legend__dot" style={{ background: STATUS_COLORS.imported }} />{' '}
                  Comenzi importate
                </span>
              </div>
              <AreaLineChart
                dates={dailyEmails.map((bucket) => bucket.date)}
                series={[
                  { label: 'Emailuri procesate', color: '#0f5acd', values: dailyEmails.map((bucket) => bucket.count), filled: true },
                  { label: 'Comenzi importate', color: STATUS_COLORS.imported, values: dailyImported.map((bucket) => bucket.count) },
                ]}
              />
            </section>

            <section className="reports-card reports-card--donut">
              <h2>Comenzi pe status</h2>
              <StatusDonutChart segments={statusSegments} centerLabel="Total" centerValue={formatNumber(orders.length)} />
            </section>

            <section className="reports-card reports-card--top-clients">
              <h2>Top 5 clienți după număr comenzi</h2>
              <TopClientsList clients={topClients} />
            </section>
          </div>

          <div className="reports-row-3">
            <section className="reports-card reports-card--volume">
              <h2>Volum marfă procesat</h2>
              <div className="reports-volume-cards">
                <div className="reports-volume-card">
                  <span className="reports-volume-card__icon reports-volume-card__icon--blue">
                    <Package aria-hidden="true" size={14} />
                  </span>
                  <span className="reports-volume-card__label">Greutate totală</span>
                  <span className="reports-volume-card__value">{formatNumber(totalWeight)} kg</span>
                  {(() => {
                    const trend = computeTrend(totalWeight, prevTotalWeight)
                    return trend ? (
                      <span className={`reports-volume-card__trend reports-volume-card__trend--${trend.direction === 'down' ? 'down' : 'up'}`}>
                        {trend.direction === 'down' ? '↓' : '↑'} {trend.percent.toFixed(0)}% față de perioada anterioară
                      </span>
                    ) : null
                  })()}
                </div>
                <div className="reports-volume-card">
                  <span className="reports-volume-card__icon reports-volume-card__icon--purple">
                    <Box aria-hidden="true" size={14} />
                  </span>
                  <span className="reports-volume-card__label">Volum total</span>
                  <span className="reports-volume-card__value">{formatNumber(totalVolume)} m³</span>
                  {(() => {
                    const trend = computeTrend(totalVolume, prevTotalVolume)
                    return trend ? (
                      <span className={`reports-volume-card__trend reports-volume-card__trend--${trend.direction === 'down' ? 'down' : 'up'}`}>
                        {trend.direction === 'down' ? '↓' : '↑'} {trend.percent.toFixed(0)}% față de perioada anterioară
                      </span>
                    ) : null
                  })()}
                </div>
                <div className="reports-volume-card">
                  <span className="reports-volume-card__icon reports-volume-card__icon--green">
                    <Euro aria-hidden="true" size={14} />
                  </span>
                  <span className="reports-volume-card__label">Valoare transport</span>
                  <span className="reports-volume-card__value">{formatCurrency(totalValue)}</span>
                  {(() => {
                    const trend = computeTrend(totalValue, prevTotalValue)
                    return trend ? (
                      <span className={`reports-volume-card__trend reports-volume-card__trend--${trend.direction === 'down' ? 'down' : 'up'}`}>
                        {trend.direction === 'down' ? '↓' : '↑'} {trend.percent.toFixed(0)}% față de perioada anterioară
                      </span>
                    ) : null
                  })()}
                </div>
              </div>
            </section>

            <section className="reports-card reports-card--gauge">
              <h2>Performanță extragere AI</h2>
              <ConfidenceGauge
                bands={confidenceBands}
                bandColors={CONFIDENCE_COLORS}
                averagePercent={averageConfidence === null ? null : averageConfidence * 100}
              />
            </section>

            <section className="reports-card reports-card--processing-time">
              <h2>Timp mediu procesare</h2>
              <ProcessingTimeList
                rows={[
                  {
                    icon: Mail,
                    label: 'Preluare email',
                    seconds: emailIngestSeconds,
                    trend:
                      emailIngestSeconds === null || prevEmailIngestSeconds === null
                        ? null
                        : computeTrend(emailIngestSeconds, prevEmailIngestSeconds),
                  },
                  {
                    icon: FileText,
                    label: 'Extragere date (AI)',
                    seconds: aiExtractionSeconds,
                    trend:
                      aiExtractionSeconds === null || prevAiExtractionSeconds === null
                        ? null
                        : computeTrend(aiExtractionSeconds, prevAiExtractionSeconds),
                  },
                  {
                    icon: Upload,
                    label: 'Import în AscendTMS',
                    seconds: importSeconds,
                    trend:
                      importSeconds === null || prevImportSeconds === null
                        ? null
                        : computeTrend(importSeconds, prevImportSeconds),
                  },
                ]}
              />
            </section>
          </div>

          <div className="reports-row-4">
            <section className="reports-card reports-card--history">
              <h2>Istoric performanță import</h2>
              <ImportHistoryTable rows={dailyPerformanceRows} />
            </section>

            <section className="reports-card reports-card--export">
              <h2>Export rapoare</h2>
              <ExportReportsCard
                onExportCsv={() => exportCsvMutation.mutate()}
                isExportingCsv={exportCsvMutation.isPending}
                csvError={
                  exportCsvMutation.isError
                    ? exportCsvMutation.error instanceof Error
                      ? exportCsvMutation.error.message
                      : 'Exportul CSV a eșuat.'
                    : null
                }
              />
            </section>
          </div>
        </>
      )}
    </div>
  )
}
