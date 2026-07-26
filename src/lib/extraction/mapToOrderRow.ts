import type { ExtractedOrderFields, FieldValue, SourceType } from './types.ts'

/** Matches orders table default (Phase 3 migration: `currency char(3) not null default 'EUR'`). */
const DEFAULT_CURRENCY = 'EUR'

export interface OrderRowInsert {
  client_order_number: string | null
  client_name: string | null
  pickup_address: string | null
  pickup_at: string | null
  delivery_address: string | null
  delivery_at: string | null
  cargo_type: string | null
  quantity: number | null
  quantity_unit: string | null
  weight_kg: number | null
  volume_m3: number | null
  transport_amount: number | null
  currency: string
  carrier_proposed: string | null
  notes: string | null
  confidence_overall: number
}

export interface OrderFieldSourceInsert {
  field_name: string
  source_type: SourceType
  source_ref: string | null
  confidence: number
}

export interface MapToOrderRowResult {
  orderRow: OrderRowInsert
  fieldSources: OrderFieldSourceInsert[]
}

interface Leaf {
  fieldName: string
  fv: FieldValue<unknown>
}

/**
 * Flattens the nested parser-output shape into the flat `orders` columns
 * and the per-field `order_field_sources` rows. confidence_overall is the
 * mean confidence across all brief fields — a missing/null field
 * contributes 0, so incompleteness alone pulls the average down without
 * needing a separate "all fields present" check.
 */
export function mapToOrderRow(fields: ExtractedOrderFields): MapToOrderRowResult {
  const leaves: Leaf[] = [
    { fieldName: 'client_order_number', fv: fields.client_order_number },
    { fieldName: 'client_name', fv: fields.client_name },
    { fieldName: 'pickup_address', fv: fields.pickup.address },
    { fieldName: 'pickup_at', fv: fields.pickup.datetime },
    { fieldName: 'delivery_address', fv: fields.delivery.address },
    { fieldName: 'delivery_at', fv: fields.delivery.datetime },
    { fieldName: 'cargo_type', fv: fields.cargo.type },
    { fieldName: 'quantity', fv: fields.cargo.quantity },
    { fieldName: 'quantity_unit', fv: fields.cargo.unit },
    { fieldName: 'weight_kg', fv: fields.cargo.weight_kg },
    { fieldName: 'volume_m3', fv: fields.cargo.volume_m3 },
    { fieldName: 'transport_amount', fv: fields.transport_value.amount },
    { fieldName: 'currency', fv: fields.transport_value.currency },
    { fieldName: 'carrier_proposed', fv: fields.carrier_proposed },
    { fieldName: 'notes', fv: fields.notes },
  ]

  const confidenceOverall = leaves.reduce((sum, leaf) => sum + leaf.fv.confidence, 0) / leaves.length

  const fieldSources: OrderFieldSourceInsert[] = leaves
    .filter((leaf) => leaf.fv.value !== null)
    .map((leaf) => ({
      field_name: leaf.fieldName,
      source_type: leaf.fv.sourceType,
      source_ref: leaf.fv.sourceRef ?? null,
      confidence: leaf.fv.confidence,
    }))

  const orderRow: OrderRowInsert = {
    client_order_number: fields.client_order_number.value,
    client_name: fields.client_name.value,
    pickup_address: fields.pickup.address.value,
    pickup_at: fields.pickup.datetime.value,
    delivery_address: fields.delivery.address.value,
    delivery_at: fields.delivery.datetime.value,
    cargo_type: fields.cargo.type.value,
    quantity: fields.cargo.quantity.value,
    quantity_unit: fields.cargo.unit.value,
    weight_kg: fields.cargo.weight_kg.value,
    volume_m3: fields.cargo.volume_m3.value,
    transport_amount: fields.transport_value.amount.value,
    currency: fields.transport_value.currency.value ?? DEFAULT_CURRENCY,
    carrier_proposed: fields.carrier_proposed.value,
    notes: fields.notes.value,
    confidence_overall: Math.round(confidenceOverall * 1000) / 1000,
  }

  return { orderRow, fieldSources }
}
