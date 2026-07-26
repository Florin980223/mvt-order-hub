export type SourceType = 'email_body' | 'pdf' | 'xlsx' | 'csv' | 'ai' | 'manual'

export interface FieldValue<T> {
  value: T | null
  confidence: number
  sourceType: SourceType
  sourceRef?: string
}

function emptyField<T>(sourceType: SourceType): FieldValue<T> {
  return { value: null, confidence: 0, sourceType }
}

export interface ExtractedOrderFields {
  client_order_number: FieldValue<string>
  client_name: FieldValue<string>
  pickup: {
    address: FieldValue<string>
    datetime: FieldValue<string>
  }
  delivery: {
    address: FieldValue<string>
    datetime: FieldValue<string>
  }
  cargo: {
    type: FieldValue<string>
    quantity: FieldValue<number>
    unit: FieldValue<string>
    weight_kg: FieldValue<number>
    volume_m3: FieldValue<number>
  }
  transport_value: {
    amount: FieldValue<number>
    currency: FieldValue<string>
  }
  carrier_proposed: FieldValue<string>
  notes: FieldValue<string>
}

export function emptyExtractedOrderFields(sourceType: SourceType): ExtractedOrderFields {
  return {
    client_order_number: emptyField(sourceType),
    client_name: emptyField(sourceType),
    pickup: {
      address: emptyField(sourceType),
      datetime: emptyField(sourceType),
    },
    delivery: {
      address: emptyField(sourceType),
      datetime: emptyField(sourceType),
    },
    cargo: {
      type: emptyField(sourceType),
      quantity: emptyField(sourceType),
      unit: emptyField(sourceType),
      weight_kg: emptyField(sourceType),
      volume_m3: emptyField(sourceType),
    },
    transport_value: {
      amount: emptyField(sourceType),
      currency: emptyField(sourceType),
    },
    carrier_proposed: emptyField(sourceType),
    notes: emptyField(sourceType),
  }
}

export interface ParseResult {
  /** Always a fully-shaped ExtractedOrderFields — unfound fields carry value: null, confidence: 0. */
  fields: ExtractedOrderFields
  needsOcr?: boolean
  warnings?: string[]
}

/** Leaf field paths within ExtractedOrderFields, dot-notation, matching order_field_sources.field_name. */
export const FIELD_PATHS = [
  'client_order_number',
  'client_name',
  'pickup.address',
  'pickup.datetime',
  'delivery.address',
  'delivery.datetime',
  'cargo.type',
  'cargo.quantity',
  'cargo.unit',
  'cargo.weight_kg',
  'cargo.volume_m3',
  'transport_value.amount',
  'transport_value.currency',
  'carrier_proposed',
  'notes',
] as const

export type FieldPath = (typeof FIELD_PATHS)[number]
