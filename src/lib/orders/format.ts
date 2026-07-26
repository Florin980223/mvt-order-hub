/** Covers every orders.status CHECK-constraint value — only 'needs_validation' is exercised by real data today. */
const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Ciornă',
  needs_validation: 'Necesită validare',
  ready_to_import: 'Pregătit pentru import',
  importing: 'Se importă',
  imported: 'Importat',
  import_failed: 'Import eșuat',
  rejected: 'Respins',
}

export function formatOrderStatus(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status
}
