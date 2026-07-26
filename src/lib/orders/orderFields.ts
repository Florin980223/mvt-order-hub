import { formatDate } from '../emails/format'
import type { OrderFieldSourceRow, OrderRow } from '../emails/types'

export interface OrderFieldDef {
  label: string
  fieldName: string
  value: (order: OrderRow) => string
}

export interface OrderFieldSection {
  title: string
  fields: OrderFieldDef[]
}

/** Grouped per the brief's mockup — covers all 15 orders columns (quantity_unit/currency ride along with quantity/transport_amount rather than as separate rows). */
export const ORDER_FIELD_SECTIONS: OrderFieldSection[] = [
  {
    title: 'Date comandă',
    fields: [
      { label: 'Nr. comandă', fieldName: 'client_order_number', value: (order) => order.client_order_number ?? '—' },
      { label: 'Client / Expeditor', fieldName: 'client_name', value: (order) => order.client_name ?? '—' },
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

/** Same red-boundary threshold ConfidenceBadge already uses, for consistency. */
const LOW_CONFIDENCE_THRESHOLD = 0.6

export function countLowConfidenceFields(order: OrderRow): number {
  const allFields = ORDER_FIELD_SECTIONS.flatMap((section) => section.fields)
  return allFields.filter((field) => {
    const source = latestSourceFor(order.order_field_sources, field.fieldName)
    return source?.confidence == null || source.confidence < LOW_CONFIDENCE_THRESHOLD
  }).length
}
