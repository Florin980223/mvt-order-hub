import { formatDate } from '../../lib/emails/format'
import type { OrderFieldSourceRow, OrderRow } from '../../lib/emails/types'

interface OrderFieldsSummaryProps {
  order: OrderRow
}

interface FieldDef {
  label: string
  fieldName: string
  value: string
}

function latestSourceFor(sources: OrderFieldSourceRow[], fieldName: string): OrderFieldSourceRow | null {
  const matches = sources.filter((source) => source.field_name === fieldName)
  if (matches.length === 0) return null
  return matches.reduce((latest, current) => (current.created_at > latest.created_at ? current : latest))
}

export function OrderFieldsSummary({ order }: OrderFieldsSummaryProps) {
  const fields: FieldDef[] = [
    { label: 'Client / Expeditor', fieldName: 'client_name', value: order.client_name ?? '—' },
    { label: 'Adresă ridicare', fieldName: 'pickup_address', value: order.pickup_address ?? '—' },
    { label: 'Adresă livrare', fieldName: 'delivery_address', value: order.delivery_address ?? '—' },
    { label: 'Data ridicare', fieldName: 'pickup_at', value: formatDate(order.pickup_at) },
    { label: 'Tip marfă', fieldName: 'cargo_type', value: order.cargo_type ?? '—' },
    {
      label: 'Cantitate',
      fieldName: 'quantity',
      value:
        order.quantity !== null ? `${order.quantity}${order.quantity_unit ? ` ${order.quantity_unit}` : ''}` : '—',
    },
    { label: 'Greutate', fieldName: 'weight_kg', value: order.weight_kg !== null ? `${order.weight_kg} kg` : '—' },
    { label: 'Volum', fieldName: 'volume_m3', value: order.volume_m3 !== null ? `${order.volume_m3} m³` : '—' },
  ]

  return (
    <div className="emails-fields-grid">
      {fields.map((field) => {
        const source = latestSourceFor(order.order_field_sources, field.fieldName)
        return (
          <div className="emails-fields-grid__item" key={field.fieldName}>
            <span className="emails-fields-grid__label">{field.label}</span>
            <span className="emails-fields-grid__value">
              {field.value}
              {source?.confidence != null && (
                <span className="emails-fields-grid__confidence"> ({Math.round(source.confidence * 100)}%)</span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
