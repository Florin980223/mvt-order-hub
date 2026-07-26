/**
 * Romanian label dictionary + value parsers shared by the email-body and
 * digital-PDF parsers, which both do line-by-line "label: value" search
 * over plain text. Diacritics are handled via flexible character classes
 * directly in each pattern (e.g. `adres[ăa]`) rather than normalizing the
 * input text, so captured values keep their original diacritics.
 */

import { emptyExtractedOrderFields } from './types.ts'
import type { ExtractedOrderFields, FieldValue, SourceType } from './types.ts'

export type LabelKind = 'text' | 'number' | 'quantity_unit' | 'amount_currency' | 'datetime'

export type LabelKey =
  | 'client_order_number'
  | 'client_name'
  | 'pickup.address'
  | 'pickup.datetime'
  | 'delivery.address'
  | 'delivery.datetime'
  | 'cargo.type'
  | 'cargo.quantity_unit'
  | 'cargo.weight_kg'
  | 'cargo.volume_m3'
  | 'transport_value.amount_currency'
  | 'carrier_proposed'
  | 'notes'

export interface LabelDef {
  key: LabelKey
  pattern: RegExp
  kind: LabelKind
}

export const LABEL_DEFS: LabelDef[] = [
  { key: 'client_order_number', kind: 'text', pattern: /^\s*(?:nr\.?\s*comand[ăa]|comand[ăa]\s*nr\.?)\s*[:-]\s*(.+)$/i },
  { key: 'client_name', kind: 'text', pattern: /^\s*client\s*[:-]\s*(.+)$/i },
  {
    key: 'pickup.address',
    kind: 'text',
    pattern: /^\s*adres[ăa]\s*(?:de\s*)?(?:ridicare|[îi]nc[ăa]rcare|pickup)\s*[:-]\s*(.+)$/i,
  },
  {
    key: 'pickup.datetime',
    kind: 'datetime',
    pattern: /^\s*data\s*(?:de\s*)?(?:ridicare|[îi]nc[ăa]rcare|pickup)\s*[:-]\s*(.+)$/i,
  },
  {
    key: 'delivery.address',
    kind: 'text',
    pattern: /^\s*adres[ăa]\s*(?:de\s*)?(?:livrare|desc[ăa]rcare|delivery)\s*[:-]\s*(.+)$/i,
  },
  {
    key: 'delivery.datetime',
    kind: 'datetime',
    pattern: /^\s*data\s*(?:de\s*)?(?:livrare|desc[ăa]rcare|delivery)\s*[:-]\s*(.+)$/i,
  },
  { key: 'cargo.type', kind: 'text', pattern: /^\s*(?:marf[ăa]|tip\s*marf[ăa])\s*[:-]\s*(.+)$/i },
  { key: 'cargo.quantity_unit', kind: 'quantity_unit', pattern: /^\s*cantitate\s*[:-]\s*(.+)$/i },
  { key: 'cargo.weight_kg', kind: 'number', pattern: /^\s*greutate\s*[:-]\s*(.+)$/i },
  { key: 'cargo.volume_m3', kind: 'number', pattern: /^\s*volum\s*[:-]\s*(.+)$/i },
  {
    key: 'transport_value.amount_currency',
    kind: 'amount_currency',
    pattern: /^\s*valoare(?:\s*transport)?\s*[:-]\s*(.+)$/i,
  },
  { key: 'carrier_proposed', kind: 'text', pattern: /^\s*transportator\s*(?:propus)?\s*[:-]\s*(.+)$/i },
  { key: 'notes', kind: 'text', pattern: /^\s*(?:observa[țt]ii|men[țt]iuni|note)\s*[:-]\s*(.+)$/i },
]

const NUMBER_PATTERN = /-?\d[\d.,\s\u00A0]*\d|-?\d+/

export function parseRomanianNumber(raw: string): number | null {
  const match = raw.match(NUMBER_PATTERN)
  if (!match) return null

  let numeric = match[0].replace(/[\s\u00A0]/g, '')
  const hasComma = numeric.includes(',')
  const hasDot = numeric.includes('.')

  if (hasComma && hasDot) {
    numeric = numeric.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    numeric = numeric.replace(',', '.')
  } else if (hasDot) {
    const dotCount = (numeric.match(/\./g) ?? []).length
    const lastGroup = numeric.split('.').pop() ?? ''
    // A lone dot followed by exactly 3 digits (e.g. "3.200") reads as a
    // thousands separator in Romanian usage, not a decimal point.
    if (dotCount > 1 || lastGroup.length === 3) {
      numeric = numeric.replace(/\./g, '')
    }
  }

  const value = Number.parseFloat(numeric)
  return Number.isNaN(value) ? null : value
}

export function parseQuantityAndUnit(raw: string): { quantity: number | null; unit: string | null } {
  const quantity = parseRomanianNumber(raw)
  const withoutNumber = raw.replace(NUMBER_PATTERN, '').trim()
  const unit = withoutNumber.replace(/^[,\-\s]+/, '').split(',')[0].trim()
  return { quantity, unit: unit.length > 0 ? unit : null }
}

const CURRENCY_PATTERN = /\b(RON|EUR|USD|LEI)\b/i

export function parseAmountAndCurrency(raw: string): { amount: number | null; currency: string | null } {
  const amount = parseRomanianNumber(raw)
  const currencyMatch = raw.match(CURRENCY_PATTERN)
  let currency: string | null = null
  if (currencyMatch) {
    const token = currencyMatch[1].toUpperCase()
    currency = token === 'LEI' ? 'RON' : token
  }
  return { amount, currency }
}

/**
 * Naive local datetime, no timezone offset applied (no tz library in
 * scope for deterministic regex parsing) — good enough for mock/test
 * data; revisit if real emails need Europe/Bucharest-aware parsing.
 */
export function parseRomanianDateTime(raw: string): string | null {
  const dateMatch = raw.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (!dateMatch) return null
  const [, dd, mm, yyyy] = dateMatch
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
  const hh = (timeMatch?.[1] ?? '00').padStart(2, '0')
  const min = timeMatch?.[2] ?? '00'
  const day = dd.padStart(2, '0')
  const month = mm.padStart(2, '0')
  return `${yyyy}-${month}-${day}T${hh}:${min}:00`
}

const LABEL_MATCH_CONFIDENCE = 0.9

/**
 * Scans plain text line-by-line for "label: value" matches against
 * LABEL_DEFS and returns a fully-shaped ExtractedOrderFields (unmatched
 * fields stay at value: null, confidence: 0). Shared by the email-body
 * and digital-PDF parsers, which both reduce to "plain text, label search".
 */
export function extractFieldsFromLabeledText(
  text: string,
  sourceType: SourceType,
  sourceRef?: string,
): ExtractedOrderFields {
  const fields = emptyExtractedOrderFields(sourceType)

  const field = <T>(value: T | null): FieldValue<T> => ({
    value,
    confidence: value === null ? 0 : LABEL_MATCH_CONFIDENCE,
    sourceType,
    sourceRef,
  })

  for (const line of text.split(/\r?\n/)) {
    for (const def of LABEL_DEFS) {
      const match = line.match(def.pattern)
      if (!match) continue
      const raw = match[1].trim()

      switch (def.key) {
        case 'client_order_number':
          fields.client_order_number = field(raw || null)
          break
        case 'client_name':
          fields.client_name = field(raw || null)
          break
        case 'pickup.address':
          fields.pickup.address = field(raw || null)
          break
        case 'pickup.datetime':
          fields.pickup.datetime = field(parseRomanianDateTime(raw))
          break
        case 'delivery.address':
          fields.delivery.address = field(raw || null)
          break
        case 'delivery.datetime':
          fields.delivery.datetime = field(parseRomanianDateTime(raw))
          break
        case 'cargo.type':
          fields.cargo.type = field(raw || null)
          break
        case 'cargo.quantity_unit': {
          const { quantity, unit } = parseQuantityAndUnit(raw)
          fields.cargo.quantity = field(quantity)
          fields.cargo.unit = field(unit)
          break
        }
        case 'cargo.weight_kg':
          fields.cargo.weight_kg = field(parseRomanianNumber(raw))
          break
        case 'cargo.volume_m3':
          fields.cargo.volume_m3 = field(parseRomanianNumber(raw))
          break
        case 'transport_value.amount_currency': {
          const { amount, currency } = parseAmountAndCurrency(raw)
          fields.transport_value.amount = field(amount)
          fields.transport_value.currency = field(currency)
          break
        }
        case 'carrier_proposed':
          fields.carrier_proposed = field(raw || null)
          break
        case 'notes':
          fields.notes = field(raw || null)
          break
      }
      break
    }
  }

  return fields
}
