import { formatDate } from '../emails/format.ts'
import type { OrderFieldSourceRow, OrderRow } from '../emails/types.ts'

export interface OrderFieldDef {
  label: string
  fieldName: string
  value: (order: OrderRow) => string
  // False for fields that aren't AI-extracted (e.g. external_reference_id,
  // set by submit-order on import) — excluded from countLowConfidenceFields
  // below, which otherwise assumes every field has a confidence source.
  trackConfidence?: boolean
}

export interface OrderFieldSection {
  title: string
  fields: OrderFieldDef[]
}

/**
 * Grouped per the brief's mockup — covers all 15 AI-extracted orders columns
 * (quantity_unit/currency ride along with quantity/transport_amount rather
 * than as separate rows), plus external_reference_id — submission metadata
 * rather than an extracted field, with no approved mockup section for it
 * yet, so it's appended to Date comandă rather than given a new section.
 */
export const ORDER_FIELD_SECTIONS: OrderFieldSection[] = [
  {
    title: 'Date comandă',
    fields: [
      { label: 'Nr. comandă', fieldName: 'client_order_number', value: (order) => order.client_order_number ?? '—' },
      { label: 'Client / Expeditor', fieldName: 'client_name', value: (order) => order.client_name ?? '—' },
      {
        label: 'ID extern',
        fieldName: 'external_reference_id',
        value: (order) => order.external_reference_id ?? '—',
        trackConfidence: false,
      },
    ],
  },
  {
    title: 'Rute',
    fields: [
      { label: 'Adresă ridicare', fieldName: 'pickup_address', value: (order) => order.pickup_address ?? '—' },
      { label: 'Adresă livrare', fieldName: 'delivery_address', value: (order) => order.delivery_address ?? '—' },
    ],
  },
  {
    title: 'Programare',
    fields: [
      { label: 'Data ridicare', fieldName: 'pickup_at', value: (order) => formatDate(order.pickup_at) },
      { label: 'Data livrare', fieldName: 'delivery_at', value: (order) => formatDate(order.delivery_at) },
    ],
  },
  {
    title: 'Marfă',
    fields: [
      { label: 'Tip marfă', fieldName: 'cargo_type', value: (order) => order.cargo_type ?? '—' },
      {
        label: 'Cantitate',
        fieldName: 'quantity',
        value: (order) =>
          order.quantity !== null ? `${order.quantity}${order.quantity_unit ? ` ${order.quantity_unit}` : ''}` : '—',
      },
      {
        label: 'Greutate',
        fieldName: 'weight_kg',
        value: (order) => (order.weight_kg !== null ? `${order.weight_kg} kg` : '—'),
      },
      {
        label: 'Volum',
        fieldName: 'volume_m3',
        value: (order) => (order.volume_m3 !== null ? `${order.volume_m3} m³` : '—'),
      },
    ],
  },
  {
    title: 'Transport',
    fields: [
      {
        label: 'Valoare transport',
        fieldName: 'transport_amount',
        value: (order) => (order.transport_amount !== null ? `${order.transport_amount} ${order.currency}` : '—'),
      },
      {
        label: 'Transportator propus',
        fieldName: 'carrier_proposed',
        value: (order) => order.carrier_proposed ?? '—',
      },
      { label: 'Observații', fieldName: 'notes', value: (order) => order.notes ?? '—' },
    ],
  },
]

export function latestSourceFor(sources: OrderFieldSourceRow[], fieldName: string): OrderFieldSourceRow | null {
  const matches = sources.filter((source) => source.field_name === fieldName)
  if (matches.length === 0) return null
  return matches.reduce((latest, current) => (current.created_at > latest.created_at ? current : latest))
}

/** Informational count across every tracked field (not just import-required ones) — the admin-configurable threshold now comes from app_settings, read by the caller. See src/lib/orders/importReadiness.ts for the stricter, import-blocking check. */
export function countLowConfidenceFields(order: OrderRow, confidenceThreshold: number): number {
  const allFields = ORDER_FIELD_SECTIONS.flatMap((section) => section.fields).filter(
    (field) => field.trackConfidence !== false,
  )
  return allFields.filter((field) => {
    const source = latestSourceFor(order.order_field_sources, field.fieldName)
    return source?.confidence == null || source.confidence < confidenceThreshold
  }).length
}
