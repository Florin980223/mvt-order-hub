interface StatusBadgeProps {
  status: string
}

export const STATUS_LABELS: Record<string, string> = {
  new: 'Nou',
  queued: 'În coadă',
  processing: 'În procesare',
  needs_validation: 'Necesită validare',
  extracted: 'Extrase',
  // Sent-orders (Phase 7e-1, figura4-comenzi-importate.png) — these are
  // derived statuses (see src/lib/orders/sentOrderStatus.ts), not raw
  // emails.status/orders.status values, but they share this component's
  // label/color lookup shape so it didn't need replacing.
  imported: 'Importată',
  confirmation_sent: 'Confirmare trimisă',
  import_failed: 'Import eșuat',
}

/** "Nou"/"În coadă" are neutral, "processing" is blue-toned per the brief's
 * own mapping. "extracted" was blue too until this pass — re-checked at
 * native resolution against both figura1-dashboard.png ("Extrase date" on
 * TechParts Solutions/Farmexim Distribution's rows) and
 * figura2-emailuri-noi.png ("Extras" on TransAgro Logistic's row): both
 * mockups show this pill green, not blue, so it's shared/genuinely wrong
 * rather than a per-page style choice — fixed here rather than only in
 * EmailsPage's own scope. */
const STATUS_CLASSES: Record<string, string> = {
  new: 'emails-status-badge--neutral',
  queued: 'emails-status-badge--neutral',
  processing: 'emails-status-badge--blue',
  needs_validation: 'emails-status-badge--amber',
  extracted: 'emails-status-badge--green',
  imported: 'emails-status-badge--green',
  confirmation_sent: 'emails-status-badge--blue',
  import_failed: 'emails-status-badge--red',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status
  const className = STATUS_CLASSES[status] ?? 'emails-status-badge--neutral'
  return <span className={`emails-status-badge ${className}`}>{label}</span>
}
