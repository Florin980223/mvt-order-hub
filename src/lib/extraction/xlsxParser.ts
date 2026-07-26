import ExcelJS from 'exceljs'
import type { CellValue } from 'exceljs'
import { assignColumnValue, findColumnKey } from './columnMapping.ts'
import { emptyExtractedOrderFields } from './types.ts'
import type { ParseResult } from './types.ts'

const COLUMN_MATCH_CONFIDENCE = 0.85

/** Reads the first sheet with more than a header row, maps header row -> field, data row 2 -> value. */
export async function parseXlsx(buffer: Buffer, sourceRef?: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  // exceljs ships a stray `declare interface Buffer extends ArrayBuffer {}`
  // in its own .d.ts (a fallback for when @types/node isn't installed) that
  // globally merges with @types/node's real (generic) Buffer type, making
  // the merged result structurally non-assignable to itself. `unknown`
  // still resolves through the same broken type, so only `any` sidesteps it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- upstream exceljs .d.ts bug, see comment above
  await workbook.xlsx.load(buffer as any)

  const fields = emptyExtractedOrderFields('xlsx')
  const warnings: string[] = []

  const sheet = workbook.worksheets.find((worksheet) => worksheet.rowCount > 1) ?? workbook.worksheets[0]
  if (!sheet) {
    warnings.push('XLSX attachment has no worksheets.')
    return { fields, warnings }
  }

  const headerByColumn = new Map<number, string>()
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headerByColumn.set(colNumber, String(cell.value ?? '').trim())
  })

  const dataRow = sheet.getRow(2)
  if (!dataRow.hasValues) {
    warnings.push('XLSX attachment has no data rows below the header.')
    return { fields, warnings }
  }

  dataRow.eachCell((cell, colNumber) => {
    const header = headerByColumn.get(colNumber)
    if (!header) return
    const key = findColumnKey(header)
    if (!key) return
    const rawValue = cellToString(cell.value)
    if (rawValue == null) return
    assignColumnValue(fields, key, rawValue, 'xlsx', sourceRef, COLUMN_MATCH_CONFIDENCE)
  })

  return { fields, warnings: warnings.length > 0 ? warnings : undefined }
}

function cellToString(value: CellValue): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && 'text' in value) return String((value as { text: unknown }).text)
  if (typeof value === 'object' && 'result' in value) return String((value as { result: unknown }).result)
  return String(value)
}
