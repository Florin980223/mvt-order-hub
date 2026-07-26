/**
 * Column-header dictionary shared by the CSV and XLSX parsers, which both
 * reduce to "tabular row, map header to field".
 */

import { parseRomanianDateTime, parseRomanianNumber } from './labelPatterns.ts'
import type { ExtractedOrderFields, FieldValue, SourceType } from './types.ts'

export type ColumnFieldKey =
  | 'client_order_number'
  | 'client_name'
  | 'pickup.address'
  | 'pickup.datetime'
  | 'delivery.address'
  | 'delivery.datetime'
  | 'cargo.type'
  | 'cargo.quantity'
  | 'cargo.unit'
  | 'cargo.weight_kg'
  | 'cargo.volume_m3'
  | 'transport_value.amount'
  | 'transport_value.currency'
  | 'carrier_proposed'
  | 'notes'

interface ColumnDef {
  key: ColumnFieldKey
  pattern: RegExp
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'client_order_number', pattern: /^nr\.?\s*comand[ăa]$/i },
  { key: 'client_name', pattern: /^client$/i },
  { key: 'pickup.address', pattern: /^adres[ăa]\s*(ridicare|[îi]nc[ăa]rcare)$/i },
  { key: 'pickup.datetime', pattern: /^data\s*(ridicare|[îi]nc[ăa]rcare)$/i },
  { key: 'delivery.address', pattern: /^adres[ăa]\s*(livrare|desc[ăa]rcare)$/i },
  { key: 'delivery.datetime', pattern: /^data\s*(livrare|desc[ăa]rcare)$/i },
  { key: 'cargo.type', pattern: /^marf[ăa]$/i },
  { key: 'cargo.quantity', pattern: /^cantitate$/i },
  { key: 'cargo.unit', pattern: /^u\.?m\.?$/i },
  { key: 'cargo.weight_kg', pattern: /^greutate(\s*kg)?$/i },
  { key: 'cargo.volume_m3', pattern: /^volum(\s*m3)?$/i },
  { key: 'transport_value.amount', pattern: /^valoare$/i },
  { key: 'transport_value.currency', pattern: /^moned[ăa]$/i },
  { key: 'carrier_proposed', pattern: /^transportator$/i },
  { key: 'notes', pattern: /^(observa[țt]ii|note)$/i },
]

export function findColumnKey(header: string): ColumnFieldKey | null {
  const trimmed = header.trim()
  return COLUMN_DEFS.find((def) => def.pattern.test(trimmed))?.key ?? null
}

export function assignColumnValue(
  fields: ExtractedOrderFields,
  key: ColumnFieldKey,
  rawValue: string,
  sourceType: SourceType,
  sourceRef: string | undefined,
  confidence: number,
): void {
  const field = <T>(value: T | null): FieldValue<T> => ({
    value,
    confidence: value === null ? 0 : confidence,
    sourceType,
    sourceRef,
  })
  const trimmed = rawValue.trim()

  switch (key) {
    case 'client_order_number':
      fields.client_order_number = field(trimmed || null)
      break
    case 'client_name':
      fields.client_name = field(trimmed || null)
      break
    case 'pickup.address':
      fields.pickup.address = field(trimmed || null)
      break
    case 'pickup.datetime':
      fields.pickup.datetime = field(parseRomanianDateTime(trimmed))
      break
    case 'delivery.address':
      fields.delivery.address = field(trimmed || null)
      break
    case 'delivery.datetime':
      fields.delivery.datetime = field(parseRomanianDateTime(trimmed))
      break
    case 'cargo.type':
      fields.cargo.type = field(trimmed || null)
      break
    case 'cargo.quantity':
      fields.cargo.quantity = field(parseRomanianNumber(trimmed))
      break
    case 'cargo.unit':
      fields.cargo.unit = field(trimmed || null)
      break
    case 'cargo.weight_kg':
      fields.cargo.weight_kg = field(parseRomanianNumber(trimmed))
      break
    case 'cargo.volume_m3':
      fields.cargo.volume_m3 = field(parseRomanianNumber(trimmed))
      break
    case 'transport_value.amount':
      fields.transport_value.amount = field(parseRomanianNumber(trimmed))
      break
    case 'transport_value.currency':
      fields.transport_value.currency = field(trimmed.toUpperCase() || null)
      break
    case 'carrier_proposed':
      fields.carrier_proposed = field(trimmed || null)
      break
    case 'notes':
      fields.notes = field(trimmed || null)
      break
  }
}
