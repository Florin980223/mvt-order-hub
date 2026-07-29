import { Box, Calendar, CheckCircle2, Euro, FileText, Layers, MapPin, Package, Scale, Truck, User, type LucideIcon } from 'lucide-react'
import { ORDER_FIELD_SECTIONS, latestSourceFor, type OrderFieldDef } from '../../lib/orders/orderFields'
import type { OrderCorrection } from '../../lib/orders/useOrderCorrection'
import type { OrderRow } from '../../lib/emails/types'
import { formatDateTime } from '../../lib/emails/format'
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
  // no Nr. comandă/Carrier/Valoare transport/Note. 'sent' is
  // SentOrdersPage's own read-only layout (figura4-comenzi-importate.png)
  // — every field unconditionally checked (nothing left to validate on an
  // already-imported order), a leading icon per field, and 2 fields no
  // other variant has (AscendTMS number, importing operator).
  variant?: 'sectioned' | 'flat' | 'preview' | 'sent'
  // 'sent' variant only — resolved display name for order.updated_by.
  // Not derivable from `order` alone (needs a profiles join the caller
  // already has via useProfilesQuery); null when RLS hides the profile
  // from a non-admin viewer or the order hasn't been imported by anyone
  // resolvable.
  operatorName?: string | null
}

// Mockup label text — confirmed identical across figura1/figura2/figura3,
// so shared by all three variants now. The sectioned variant used to fall
// back to ORDER_FIELD_SECTIONS' own labels ("Nr. comandă", "Transportator
// propus", "Observații"...), which turned out to just be stale/different
// text, not a deliberate divergence from figura3 (which uses this same
// map's values: "Număr comandă client", "Carrier propus", "Note").
const MOCKUP_LABELS: Record<string, string> = {
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

// figura4's own labels — same base text as MOCKUP_LABELS except
// carrier_proposed, which reads "Carrier atribuit" here (an order that's
// already imported has an assigned carrier, not a proposed one) — a real
// semantic difference confirmed against the mockup, not reusable as-is.
const SENT_LABELS: Record<string, string> = {
  ...MOCKUP_LABELS,
  carrier_proposed: 'Carrier atribuit',
  external_reference_id: 'Numărcomandă AscendTMS',
}

// __operator_import is a sentinel, not a real OrderFieldDef — "Operator
// import" isn't order data at all, it's order.updated_by resolved to a
// profile name by the caller (see operatorName prop) and passed in,
// since a plain PostgREST embed can't cross the profiles RLS gap for a
// non-admin viewer the way this file's other fields can.
const SENT_ROWS: string[][] = [
  ['client_order_number', 'client_name'],
  ['pickup_address', 'delivery_address'],
  ['pickup_at', 'delivery_at'],
  ['cargo_type', 'quantity', 'weight_kg', 'volume_m3'],
  ['transport_amount', 'carrier_proposed'],
  ['external_reference_id', '__operator_import'],
  ['notes'],
]

// figura4 only — a leading icon inside the value box, one per field.
// First-time introduction of a per-field (rather than per-section) icon
// concept in this file. Fields absent from this map (client_order_number,
// client_name, notes) render with no leading icon, matching the mockup.
const SENT_FIELD_ICONS: Record<string, LucideIcon> = {
  pickup_address: MapPin,
  delivery_address: MapPin,
  pickup_at: Calendar,
  delivery_at: Calendar,
  cargo_type: Package,
  quantity: Layers,
  weight_kg: Scale,
  volume_m3: Box,
  transport_amount: Euro,
  carrier_proposed: Truck,
  external_reference_id: FileText,
  __operator_import: User,
}

// figura2-emailuri-noi.png only — a leading icon before the value text
// (confirmed at native resolution: no border box around the value here,
// unlike figura4's 'sent' variant — just the icon + trailing confidence
// check/warning, same as this variant already had). client_name has no
// icon, matching the mockup.
const PREVIEW_FIELD_ICONS: Record<string, LucideIcon> = {
  pickup_address: MapPin,
  delivery_address: MapPin,
  pickup_at: Calendar,
  cargo_type: Package,
  quantity: Layers,
  weight_kg: Scale,
  volume_m3: Box,
}

// Sectioned variant only (figura3-comenzi-asteptare.png). FileText/MapPin/
// Calendar reuse the same icon identity this file already uses elsewhere
// for these concepts (Hartă link, date-edit button); Package/Truck are
// first-time introductions — no existing icon identity to match for Marfă/
// Transport.
const SECTION_ICONS: Record<string, LucideIcon> = {
  'Date comandă': FileText,
  Rute: MapPin,
  Programare: Calendar,
  Marfă: Package,
  Transport: Truck,
}

const ALL_FIELDS = ORDER_FIELD_SECTIONS.flatMap((section) => section.fields)

function fieldByName(fieldName: string): OrderFieldDef {
  const field = ALL_FIELDS.find((f) => f.fieldName === fieldName)
  if (!field) throw new Error(`Unknown order field: ${fieldName}`)
  return field
}

export function PendingOrderFields({ order, correction, variant = 'sectioned', operatorName }: PendingOrderFieldsProps) {
  const isEditing = correction?.isEditing ?? false
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD

  // Sectioned variant only (figura3-comenzi-asteptare.png) — the flat/
  // preview variants get their Hartă link / calendar button from
  // renderFieldExtras below instead, rendered beside the field in their own
  // flat-cell row rather than inside the item itself.
  function renderField(field: OrderFieldDef, label: string, withExtras = false, leadingIcon?: LucideIcon) {
    const source = latestSourceFor(order.order_field_sources, field.fieldName)
    const value = field.value(order)
    const isAddress = withExtras && (field.fieldName === 'pickup_address' || field.fieldName === 'delivery_address')
    const isDate = withExtras && (field.fieldName === 'pickup_at' || field.fieldName === 'delivery_at')
    const LeadingIcon = leadingIcon

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
        <span
          className={[
            'pending-orders-fields__value',
            isDate && 'pending-orders-fields__value--inline-action',
            // Confirmed at native resolution against figura3-comenzi-asteptare.png
            // — every value here sits in a bordered box (value + percent +
            // checkmark together), unlike flat/preview's plain-text values.
            variant === 'sectioned' && 'pending-orders-fields__value--boxed',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {LeadingIcon && <LeadingIcon aria-hidden="true" size={13} className="pending-orders-fields__value-icon" />}
          {value}
          <FieldConfidenceIndicator
            confidence={source?.confidence ?? null}
            threshold={confidenceThreshold}
            showPercent={variant === 'sectioned'}
          />
          {isDate && (
            <button
              type="button"
              className="pending-orders-fields__calendar-btn"
              onClick={() => correction?.startEditing()}
              aria-label="Editează data"
            >
              <Calendar aria-hidden="true" size={14} />
            </button>
          )}
        </span>
        {isAddress && value !== '—' && (
          <a
            className="pending-orders-fields__map-btn"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin aria-hidden="true" size={14} />
            Vezi pe hartă
          </a>
        )}
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

  // figura4-comenzi-importate.png — an already-imported order has nothing
  // left to validate, so every field renders unconditionally checked (no
  // percent, no threshold/warning branch) with a leading per-field icon,
  // and date fields get a plain non-interactive calendar icon rather than
  // the edit-triggering button the other variants use (this whole page is
  // read-only, there's no correction/editing concept here).
  function renderSentField(fieldName: string) {
    const Icon = SENT_FIELD_ICONS[fieldName]
    const isAddress = fieldName === 'pickup_address' || fieldName === 'delivery_address'

    let label: string
    let value: string

    if (fieldName === '__operator_import') {
      label = 'Operator import'
      value = operatorName ?? '—'
    } else if (fieldName === 'pickup_at' || fieldName === 'delivery_at') {
      // figura4 shows date+time here, unlike the other variants' date-only
      // rendering (field.value only formats the date) — an already-
      // imported order's schedule is confirmed, so the mockup shows it in
      // full rather than the date-only summary used pre-import.
      const field = fieldByName(fieldName)
      label = SENT_LABELS[fieldName] ?? field.label
      value = formatDateTime(order[fieldName])
    } else {
      const field = fieldByName(fieldName)
      label = SENT_LABELS[fieldName] ?? field.label
      value = field.value(order)
    }

    return (
      <div className="pending-orders-fields__item" key={fieldName}>
        <span className="pending-orders-fields__label">{label}</span>
        <span className="pending-orders-fields__sent-row">
          <span className="pending-orders-fields__sent-box">
            {Icon && <Icon aria-hidden="true" size={14} className="pending-orders-fields__value-icon" />}
            <span className="pending-orders-fields__sent-box-value">{value}</span>
            {isAddress && value !== '—' && (
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
          </span>
          <CheckCircle2 aria-hidden="true" size={14} className="pending-orders-fields__check pending-orders-fields__check--ok" />
        </span>
      </div>
    )
  }

  if (variant === 'sent') {
    return (
      <div className="pending-orders-fields pending-orders-fields--flat">
        {SENT_ROWS.map((fieldNames, rowIndex) => (
          <div key={rowIndex} className="pending-orders-fields__flat-row">
            {fieldNames.map((fieldName) => (
              <div className="pending-orders-fields__flat-cell" key={fieldName}>
                {renderSentField(fieldName)}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'flat' || variant === 'preview') {
    const rows = variant === 'flat' ? FLAT_ROWS : PREVIEW_ROWS
    const labels = variant === 'flat' ? MOCKUP_LABELS : PREVIEW_LABELS
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
                  {renderField(field, label, false, variant === 'preview' ? PREVIEW_FIELD_ICONS[fieldName] : undefined)}
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
      {ORDER_FIELD_SECTIONS.map((section) => {
        const SectionIcon = SECTION_ICONS[section.title]
        return (
          <section key={section.title} className="pending-orders-fields__section">
            <h3>
              {SectionIcon && <SectionIcon aria-hidden="true" size={18} />}
              {section.title}
            </h3>
            <div className="pending-orders-fields__grid">
              {/* Date comandă's 3rd field (external_reference_id, trackConfidence:
                  false) has no mockup section — figura3 shows only 2 fields
                  here. Rendering it anyway left an odd item count, wrapping
                  onto its own row and staggering the section's height
                  against Rute/Programare next to it. */}
              {section.fields
                .filter((field) => field.trackConfidence !== false)
                .map((field) => renderField(field, MOCKUP_LABELS[field.fieldName] ?? field.label, true))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
