import { emptyExtractedOrderFields } from './types.ts'
import type { ExtractedOrderFields, FieldValue, ParseResult, SourceType } from './types.ts'

/** Attachment sources (csv/xlsx/pdf/ai/manual) always outrank email_body when both produce a value. */
function sourcePriority(sourceType: SourceType): number {
  return sourceType === 'email_body' ? 0 : 1
}

function mergeFieldValue<T>(current: FieldValue<T>, incoming: FieldValue<T>): FieldValue<T> {
  if (incoming.value === null) return current
  if (current.value === null) return incoming
  return sourcePriority(incoming.sourceType) >= sourcePriority(current.sourceType) ? incoming : current
}

function mergeTwo(a: ExtractedOrderFields, b: ExtractedOrderFields): ExtractedOrderFields {
  return {
    client_order_number: mergeFieldValue(a.client_order_number, b.client_order_number),
    client_name: mergeFieldValue(a.client_name, b.client_name),
    pickup: {
      address: mergeFieldValue(a.pickup.address, b.pickup.address),
      datetime: mergeFieldValue(a.pickup.datetime, b.pickup.datetime),
    },
    delivery: {
      address: mergeFieldValue(a.delivery.address, b.delivery.address),
      datetime: mergeFieldValue(a.delivery.datetime, b.delivery.datetime),
    },
    cargo: {
      type: mergeFieldValue(a.cargo.type, b.cargo.type),
      quantity: mergeFieldValue(a.cargo.quantity, b.cargo.quantity),
      unit: mergeFieldValue(a.cargo.unit, b.cargo.unit),
      weight_kg: mergeFieldValue(a.cargo.weight_kg, b.cargo.weight_kg),
      volume_m3: mergeFieldValue(a.cargo.volume_m3, b.cargo.volume_m3),
    },
    transport_value: {
      amount: mergeFieldValue(a.transport_value.amount, b.transport_value.amount),
      currency: mergeFieldValue(a.transport_value.currency, b.transport_value.currency),
    },
    carrier_proposed: mergeFieldValue(a.carrier_proposed, b.carrier_proposed),
    notes: mergeFieldValue(a.notes, b.notes),
  }
}

/**
 * Merges one email-body ParseResult with zero or more attachment
 * ParseResults into a single order. Order of the input array doesn't
 * matter — precedence is decided by source type, not position.
 */
export function mergeParseResults(results: ParseResult[]): ParseResult {
  if (results.length === 0) {
    return { fields: emptyExtractedOrderFields('email_body') }
  }

  const fields = results.map((result) => result.fields).reduce(mergeTwo)
  const needsOcr = results.some((result) => result.needsOcr) || undefined
  const warnings = results.flatMap((result) => result.warnings ?? [])

  return { fields, needsOcr, warnings: warnings.length > 0 ? warnings : undefined }
}
