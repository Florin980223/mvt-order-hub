import { Calendar, MapPin } from 'lucide-react'
import { ORDER_FIELD_SECTIONS, latestSourceFor, type OrderFieldDef } from '../../lib/orders/orderFields'
import type { OrderCorrection } from '../../lib/orders/useOrderCorrection'
import type { OrderRow } from '../../lib/emails/types'
import { FieldConfidenceIndicator } from '../emails/FieldConfidenceIndicator'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'

interface PendingOrderFieldsProps {
  order: OrderRow
  correction?: OrderCorrection
  // 'sectioned' (default) is PendingOrdersPage's grouped layout with
  // section subheadings. 'flat' is Dashboard's ungrouped mockup layout
  // (figura1-dashboard.png), with a 4-column "Marfă" row and Hartă/
  // calendar buttons on address/date fields. 'preview' is EmailsPage's
  // smaller quick-preview layout (figura2-emailuri-noi.png) — 8 fields,
  // no Nr. comandă/Carrier/Valoare transport/Note.
  variant?: 'sectioned' | 'flat' | 'preview'
}

// Mockup-specific label text for the flat/preview variants only — the
// sectioned variant (PendingOrdersPage) keeps its existing Romanian
// labels from ORDER_FIELD_SECTIONS unchanged.
const FLAT_LABELS: Record<string, string> = {
  client_order_number: 'Număr comandă client',
  client_name: 'Client / Expeditor',
  pickup_address: 'Adresă Pickup',
  delivery_address: 'Adresă Delivery',
  pickup_at: 'Dată & Ora Pickup',
  delivery_at: 'Dată & Ora Delivery',
  cargo_type: 'Tip marfă',
  quantity: 'Cantitate',
  weight_kg: 'Greutate',
  volume_m3: 'Volum',
  transport_amount: 'Valoare transport',
  carrier_proposed: 'Carrier propus',
  notes: 'Note',
}

const PREVIEW_LABELS: Record<string, string> = {
  client_name: 'Client / Expeditor',
  pickup_address: 'Adresă Pickup',
  delivery_address: 'Adresă Delivery',
  pickup_at: 'Dată Pickup',
  cargo_type: 'Tip marfă',
  quantity: 'Cantitate',
  weight_kg: 'Greutate',
  volume_m3: 'Volum',
}

const FLAT_ROWS: string[][] = [
  ['client_order_number', 'client_name'],
  ['pickup_address', 'delivery_address'],
  ['pickup_at', 'delivery_at'],
  ['cargo_type', 'quantity', 'weight_kg', 'volume_m3'],
  ['transport_amount', 'carrier_proposed'],
  ['notes'],
]

// figura2's own row grouping: 3 columns, then 5 columns.
const PREVIEW_ROWS: string[][] = [
  ['client_name', 'pickup_address', 'delivery_address'],
  ['pickup_at', 'cargo_type', 'quantity', 'weight_kg', 'volume_m3'],
]

const ALL_FIELDS = ORDER_FIELD_SECTIONS.flatMap((section) => section.fields)

function fieldByName(fieldName: string): OrderFieldDef {
  const field = ALL_FIELDS.find((f) => f.fieldName === fieldName)
  if (!field) throw new Error(`Unknown order field: ${fieldName}`)
  return field
}

export function PendingOrderFields({ order, correction, variant = 'sectioned' }: PendingOrderFieldsProps) {
  const isEditing = correction?.isEditing ?? false
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD

  function renderField(field: OrderFieldDef, label: string) {
    const source = latestSourceFor(order.order_field_sources, field.fieldName)

    if (isEditing && field.inputType && correction) {
      return (
        <div className="pending-orders-fields__item" key={field.fieldName}>
          <label className="pending-orders-fields__label" htmlFor={`correct-${field.fieldName}`}>
            {label}
          </label>
          <input
            id={`correct-${field.fieldName}`}
            type={field.inputType === 'datetime' ? 'datetime-local' : field.inputType}
            value={correction.draftValues[field.fieldName] ?? ''}
            onChange={(e) => correction.updateDraftField(field.fieldName, e.target.value)}
          />
        </div>
      )
    }

    return (
      <div className="pending-orders-fields__item" key={field.fieldName}>
        <span className="pending-orders-fields__label">{label}</span>
        <span className="pending-orders-fields__value">
          {field.value(order)}
          <FieldConfidenceIndicator confidence={source?.confidence ?? null} threshold={confidenceThreshold} />
        </span>
      </div>
    )
  }

  // Shared by 'flat' and 'preview' — the Hartă link on address fields and
  // the calendar-triggers-edit-mode button on date fields, next to the
  // field's own rendered value.
  function renderFieldExtras(fieldName: string, value: string) {
    const isAddress = fieldName === 'pickup_address' || fieldName === 'delivery_address'
    const isDate = fieldName === 'pickup_at' || fieldName === 'delivery_at'

    return (
      <>
        {!isEditing && isAddress && value !== '—' && (
          <a
            className="pending-orders-fields__map-btn"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin aria-hidden="true" size={14} />
            Hartă
          </a>
        )}
        {!isEditing && isDate && (
          <button
            type="button"
            className="pending-orders-fields__calendar-btn"
            onClick={() => correction?.startEditing()}
            aria-label="Editează data"
          >
            <Calendar aria-hidden="true" size={14} />
          </button>
        )}
      </>
    )
  }

  if (variant === 'flat' || variant === 'preview') {
    const rows = variant === 'flat' ? FLAT_ROWS : PREVIEW_ROWS
    const labels = variant === 'flat' ? FLAT_LABELS : PREVIEW_LABELS
    const rootClass =
      variant === 'flat' ? 'pending-orders-fields pending-orders-fields--flat' : 'pending-orders-fields pending-orders-fields--preview'

    return (
      <div className={rootClass}>
        {rows.map((fieldNames, rowIndex) => (
          <div key={rowIndex} className="pending-orders-fields__flat-row">
            {fieldNames.map((fieldName) => {
              const field = fieldByName(fieldName)
              const label = labels[fieldName] ?? field.label
              const value = field.value(order)

              return (
                <div className="pending-orders-fields__flat-cell" key={fieldName}>
                  {renderField(field, label)}
                  {renderFieldExtras(fieldName, value)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="pending-orders-fields">
      {ORDER_FIELD_SECTIONS.map((section) => (
        <section key={section.title} className="pending-orders-fields__section">
          <h3>{section.title}</h3>
          <div className="pending-orders-fields__grid">
            {section.fields.map((field) => renderField(field, field.label))}
          </div>
        </section>
      ))}
    </div>
  )
}
