function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** DD.MM.YYYY, per the brief's formatting rules. */
export function formatDate(isoString: string | null): string {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`
}

/** 24h HH:mm, per the brief's formatting rules. */
export function formatTime(isoString: string | null): string {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '—'
  return `${formatDate(isoString)}, ${formatTime(isoString)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
