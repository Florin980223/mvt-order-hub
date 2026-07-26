import Papa from 'papaparse'
import { assignColumnValue, findColumnKey } from './columnMapping.ts'
import { emptyExtractedOrderFields } from './types.ts'
import type { ParseResult } from './types.ts'

const COLUMN_MATCH_CONFIDENCE = 0.85

/**
 * Delimiter is auto-detected by papaparse (comma/semicolon/tab/pipe).
 * Encoding scope for Phase 5a is UTF-8 (+ BOM stripping) only — legacy
 * Windows-1250/1252 Excel exports are deferred until real CSVs need it.
 */
export function parseCsv(input: string | Buffer, sourceRef?: string): ParseResult {
  const text = stripBom(typeof input === 'string' ? input : input.toString('utf-8'))
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })

  const fields = emptyExtractedOrderFields('csv')
  const warnings: string[] = result.errors.map((error) => `CSV parse warning: ${error.message}`)

  const row = result.data[0]
  if (!row) {
    warnings.push('CSV attachment has no data rows.')
    return { fields, warnings }
  }

  for (const [header, rawValue] of Object.entries(row)) {
    const key = findColumnKey(header)
    if (!key || rawValue == null) continue
    assignColumnValue(fields, key, String(rawValue), 'csv', sourceRef, COLUMN_MATCH_CONFIDENCE)
  }

  return { fields, warnings: warnings.length > 0 ? warnings : undefined }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}
