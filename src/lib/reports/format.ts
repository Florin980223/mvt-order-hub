const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: 'În așteptare',
  sent: 'Trimis',
  succeeded: 'Reușit',
  failed: 'Eșuat',
}

export function formatSubmissionStatus(status: string): string {
  return SUBMISSION_STATUS_LABELS[status] ?? status
}

/** No percentage formatter existed anywhere in the app before figura5's KPI/trend work — every prior call site built this inline. */
export function formatPercent(ratio: number, fractionDigits = 0): string {
  return `${(ratio * 100).toFixed(fractionDigits).replace('.', ',')}%`
}

/** Romanian thousands-separator number format, per figura5's "1.245.250 kg" / "18.450 m³" style. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ro-RO').format(Math.round(value))
}

/** No currency formatter existed anywhere in the app before this — transport_amount was always shown as raw `${amount} ${currency}`. */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return `${formatNumber(amount)} ${currency}`
}

/** "1 min 24 sec" / "45 sec", per figura5's "Timp mediu procesare" rows — no duration formatter existed anywhere in the app before this. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return minutes === 0 ? `${seconds} sec` : `${minutes} min ${seconds} sec`
}
