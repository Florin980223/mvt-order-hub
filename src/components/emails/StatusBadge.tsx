interface StatusBadgeProps {
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nou',
  needs_validation: 'Necesită validare',
  extracted: 'Extrase',
}

/** "Nou" and "Extrase" are both blue-toned per the brief's own mapping — "Nou" is the muted blue/gray variant. */
const STATUS_CLASSES: Record<string, string> = {
  new: 'emails-status-badge--neutral',
  needs_validation: 'emails-status-badge--amber',
  extracted: 'emails-status-badge--blue',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status
  const className = STATUS_CLASSES[status] ?? 'emails-status-badge--neutral'
  return <span className={`emails-status-badge ${className}`}>{label}</span>
}
