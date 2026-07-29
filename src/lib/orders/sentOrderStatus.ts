import type { OrderRow } from '../emails/types'

/**
 * figura4-comenzi-importate.png shows a status distinct from the raw
 * orders.status column: "Confirmare trimisă" isn't a status value at all,
 * it's derived from whether a 'confirmation_sent' order_events row exists
 * for an otherwise-'imported' order. "Necesită follow-up" has no signal
 * anywhere in the schema (no status, no event type) — deliberately never
 * returned here rather than inventing a heuristic; its tab always shows 0.
 */
export type SentOrderStatus = 'imported' | 'confirmation_sent' | 'import_failed'

export function deriveSentOrderStatus(order: OrderRow): SentOrderStatus {
  if (order.status === 'import_failed') return 'import_failed'
  const hasConfirmation = order.order_events.some((event) => event.event_type === 'confirmation_sent')
  return hasConfirmation ? 'confirmation_sent' : 'imported'
}
