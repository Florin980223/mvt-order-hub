import { ORDER_FIELD_SECTIONS, latestSourceFor } from './orderFields.ts'
import type { OrderRow } from '../emails/types.ts'

/**
 * Brief 5.5's required-fields-for-import list. delivery_at is treated as
 * always required (the brief only conditions it on "if AscendTMS requires
 * it," which nothing yet configures). transport_amount/currency/
 * carrier_proposed are deliberately excluded — the brief conditions them
 * on "if the MVT flow requires it," which is likewise unconfigured, so
 * requiring them would invent a rule the brief never actually states.
 */
const REQUIRED_SINGLE_FIELDS: (keyof OrderRow)[] = [
  'client_order_number',
  'client_name',
  'pickup_address',
  'delivery_address',
  'pickup_at',
  'delivery_at',
  'cargo_type',
]

/** Brief 5.5: "minimum o valoare de cantitate/greutate/volum" — at least one of these three must be present. */
const QUANTITY_GROUP_FIELDS: (keyof OrderRow)[] = ['quantity', 'weight_kg', 'volume_m3']
const QUANTITY_GROUP_LABEL = 'Cantitate / Greutate / Volum'

export interface ImportReadinessResult {
  ready: boolean
  missingRequiredFields: string[]
  lowConfidenceFields: string[]
}

function fieldLabel(fieldName: string): string {
  for (const section of ORDER_FIELD_SECTIONS) {
    const field = section.fields.find((f) => f.fieldName === fieldName)
    if (field) return field.label
  }
  return fieldName
}

function checkFieldConfidence(fieldName: string, order: OrderRow, confidenceThreshold: number): boolean {
  const source = latestSourceFor(order.order_field_sources, fieldName)
  return source?.confidence != null && source.confidence >= confidenceThreshold
}

/**
 * Only brief-5.5-required fields can block import — a low-confidence
 * non-required field (e.g. notes, carrier_proposed) is not blocking here;
 * see countLowConfidenceFields in orderFields.ts for the broader,
 * non-blocking "needs review" count shown elsewhere in the UI.
 */
export function checkImportReadiness(order: OrderRow, confidenceThreshold: number): ImportReadinessResult {
  const missingRequiredFields: string[] = []
  const lowConfidenceFields: string[] = []

  for (const fieldName of REQUIRED_SINGLE_FIELDS) {
    const value = order[fieldName]
    if (value === null || value === undefined) {
      missingRequiredFields.push(fieldLabel(fieldName))
    } else if (!checkFieldConfidence(fieldName, order, confidenceThreshold)) {
      lowConfidenceFields.push(fieldLabel(fieldName))
    }
  }

  const presentQuantityFields = QUANTITY_GROUP_FIELDS.filter((fieldName) => order[fieldName] !== null && order[fieldName] !== undefined)
  if (presentQuantityFields.length === 0) {
    missingRequiredFields.push(QUANTITY_GROUP_LABEL)
  } else {
    for (const fieldName of presentQuantityFields) {
      if (!checkFieldConfidence(fieldName, order, confidenceThreshold)) {
        lowConfidenceFields.push(fieldLabel(fieldName))
      }
    }
  }

  return {
    ready: missingRequiredFields.length === 0 && lowConfidenceFields.length === 0,
    missingRequiredFields,
    lowConfidenceFields,
  }
}
