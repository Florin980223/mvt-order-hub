export const DAY_MS = 24 * 60 * 60 * 1000

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Compares only the date portion — inclusive on both ends of a day-granularity picker. */
export function isWithinDateRange(isoTimestamp: string, fromDate: string, toDate: string): boolean {
  const day = isoTimestamp.slice(0, 10)
  return day >= fromDate && day <= toDate
}

export function countByStatus<T extends string>(items: { status: string }[], statuses: T[]): Record<T, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<T, number>
  for (const item of items) {
    if (item.status in counts) counts[item.status as T] += 1
  }
  return counts
}

/**
 * The immediately-preceding period of equal length to [fromDate, toDate],
 * with no gap (e.g. 01.07-23.07 -> 09.06-30.06, both 23 days). Used for
 * figura5's "+X% față de perioada anterioară" trend indicators — no such
 * comparison existed anywhere in this codebase before this phase.
 */
export function previousPeriodRange(fromDate: string, toDate: string): { from: string; to: string } {
  const from = new Date(`${fromDate}T00:00:00.000Z`)
  const to = new Date(`${toDate}T00:00:00.000Z`)
  const spanMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - DAY_MS)
  const prevFrom = new Date(prevTo.getTime() - spanMs)
  return { from: toDateInputValue(prevFrom), to: toDateInputValue(prevTo) }
}

export interface TrendResult {
  direction: 'up' | 'down' | 'flat'
  percent: number
}

/**
 * null when the previous period has no baseline (avoids a fabricated or
 * Infinity percentage) — render as "—" in that case rather than guessing.
 */
export function computeTrend(current: number, previous: number): TrendResult | null {
  if (previous === 0) return current === 0 ? { direction: 'flat', percent: 0 } : null
  const change = ((current - previous) / previous) * 100
  if (change === 0) return { direction: 'flat', percent: 0 }
  return { direction: change > 0 ? 'up' : 'down', percent: Math.abs(change) }
}

export interface DayBucket {
  date: string
  count: number
}

/** One entry per calendar day in [fromDate, toDate], zero-filled for days with no matches. */
export function bucketByDay<T>(
  items: T[],
  getDate: (item: T) => string | null,
  fromDate: string,
  toDate: string,
): DayBucket[] {
  const days: DayBucket[] = []
  const end = new Date(`${toDate}T00:00:00.000Z`).getTime()
  for (let cursor = new Date(`${fromDate}T00:00:00.000Z`).getTime(); cursor <= end; cursor += DAY_MS) {
    days.push({ date: toDateInputValue(new Date(cursor)), count: 0 })
  }
  const indexByDate = new Map(days.map((day, index) => [day.date, index]))
  for (const item of items) {
    const iso = getDate(item)
    if (!iso) continue
    const index = indexByDate.get(iso.slice(0, 10))
    if (index !== undefined) days[index].count += 1
  }
  return days
}

export interface ClientOrderCount {
  clientName: string
  count: number
}

export function topClientsByOrderCount(orders: { client_name: string | null }[], limit = 5): ClientOrderCount[] {
  const counts = new Map<string, number>()
  for (const order of orders) {
    if (!order.client_name) continue
    counts.set(order.client_name, (counts.get(order.client_name) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([clientName, count]) => ({ clientName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Mean of (end - start) in seconds, over pairs where both timestamps exist and end >= start. null when no valid pair exists. */
export function averageDurationSeconds(pairs: Array<{ start: string | null; end: string | null }>): number | null {
  const durations = pairs
    .filter((pair): pair is { start: string; end: string } => pair.start !== null && pair.end !== null)
    .map((pair) => (new Date(pair.end).getTime() - new Date(pair.start).getTime()) / 1000)
    .filter((seconds) => seconds >= 0)
  if (durations.length === 0) return null
  return durations.reduce((sum, seconds) => sum + seconds, 0) / durations.length
}

/**
 * "Import în AscendTMS" duration — submission_jobs.updated_at is a generic
 * ON UPDATE trigger timestamp shared by every table in this schema, not a
 * dedicated "succeeded at" marker, so orders.imported_at (set precisely at
 * import success, in the same write as the final status transition) is
 * used as the end timestamp instead, joined back to its submission_jobs
 * row by order_id.
 */
export function averageImportDuration(
  submissionJobs: Array<{ order_id: string; status: string; created_at: string }>,
  orders: Array<{ id: string; imported_at: string | null }>,
): number | null {
  const importedAtById = new Map(orders.map((order) => [order.id, order.imported_at]))
  const pairs = submissionJobs
    .filter((job) => job.status === 'succeeded')
    .map((job) => ({ start: job.created_at, end: importedAtById.get(job.order_id) ?? null }))
  return averageDurationSeconds(pairs)
}

export interface DailyPerformanceRow {
  date: string
  total: number
  imported: number
  pending: number
  rejected: number
  importRate: number | null
  volume: number
  weight: number
  value: number
}

interface DailyPerformanceOrder {
  status: string
  weight_kg: number | null
  volume_m3: number | null
  transport_amount: number | null
}

/**
 * "Istoric performanță import" table — one row per calendar day, bucketed
 * by the order's parent email's received_at (same day-grouping concept as
 * the "Comenzi procesate pe zi" chart). Volum/Greutate/Valoare sum only
 * imported orders that day (import-performance context), while "Total
 * comenzi" counts every order regardless of status.
 */
export function bucketDailyPerformance(
  items: Array<{ date: string; order: DailyPerformanceOrder }>,
  fromDate: string,
  toDate: string,
): DailyPerformanceRow[] {
  const dayKeys = bucketByDay(items, (item) => item.date, fromDate, toDate).map((bucket) => bucket.date)
  const itemsByDay = new Map<string, DailyPerformanceOrder[]>(dayKeys.map((date) => [date, []]))

  for (const item of items) {
    const day = item.date.slice(0, 10)
    itemsByDay.get(day)?.push(item.order)
  }

  return dayKeys
    .map((date) => {
      const dayOrders = itemsByDay.get(date) ?? []
      const imported = dayOrders.filter((order) => order.status === 'imported')
      const pending = dayOrders.filter((order) => order.status === 'needs_validation').length
      const rejected = dayOrders.filter((order) => order.status === 'rejected').length

      return {
        date,
        total: dayOrders.length,
        imported: imported.length,
        pending,
        rejected,
        importRate: dayOrders.length === 0 ? null : imported.length / dayOrders.length,
        volume: imported.reduce((sum, order) => sum + (order.volume_m3 ?? 0), 0),
        weight: imported.reduce((sum, order) => sum + (order.weight_kg ?? 0), 0),
        value: imported.reduce((sum, order) => sum + (order.transport_amount ?? 0), 0),
      }
    })
    .reverse() // most recent day first, matching figura5's own ordering
}

export interface ConfidenceBand {
  label: string
  count: number
  percent: number
}

/** Peste 95% / 80-95% / Sub 80%, per figura5-rapoarte.png's "Performanță extragere AI" breakdown. */
export function bucketByConfidence(orders: { confidence_overall: number | null }[]): ConfidenceBand[] {
  const values = orders.map((order) => order.confidence_overall).filter((value): value is number => value !== null)
  const total = values.length
  const over95 = values.filter((value) => value >= 0.95).length
  const mid = values.filter((value) => value >= 0.8 && value < 0.95).length
  const under80 = values.filter((value) => value < 0.8).length
  const percentOf = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100))

  return [
    { label: 'Peste 95%', count: over95, percent: percentOf(over95) },
    { label: '80% - 95%', count: mid, percent: percentOf(mid) },
    { label: 'Sub 80%', count: under80, percent: percentOf(under80) },
  ]
}
