import { extractText, getDocumentProxy } from 'unpdf'
import { extractFieldsFromLabeledText } from './labelPatterns.ts'
import { emptyExtractedOrderFields } from './types.ts'
import type { ParseResult } from './types.ts'

const MIN_EXTRACTABLE_CHARS = 20

/**
 * Extracts text from a digital PDF and label-searches it like the email
 * body. If the PDF has no meaningful text layer (scanned/image-based),
 * flags needsOcr instead of attempting extraction.
 *
 * Uses unpdf (a thin, actively-maintained wrapper around pdfjs-dist) —
 * pdf-parse was tried first but bundles a long-unmaintained pdf.js
 * (v1.10.100, ~2018) that fails to parse pdf-lib's modern output
 * ("bad XRef entry" / unknown flate compression method).
 */
export async function parsePdf(buffer: Buffer, sourceRef?: string): Promise<ParseResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  const trimmed = text.trim()

  if (trimmed.length < MIN_EXTRACTABLE_CHARS) {
    return {
      fields: emptyExtractedOrderFields('pdf'),
      needsOcr: true,
      warnings: ['PDF has no extractable text layer — likely scanned/image-based, needs OCR or manual entry.'],
    }
  }

  const fields = extractFieldsFromLabeledText(trimmed, 'pdf', sourceRef)
  return { fields }
}
