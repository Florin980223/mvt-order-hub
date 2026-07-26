import { convert } from 'html-to-text'
import { extractFieldsFromLabeledText } from './labelPatterns.ts'
import type { ParseResult } from './types.ts'

/**
 * Sanitizes an email's HTML body down to plain text — html-to-text strips
 * every tag, so the output can carry no markup. Exported separately from
 * parseEmailBody so callers can also persist it as emails.body_text
 * (left null at Phase 4a ingestion time specifically for this phase).
 */
export function sanitizeEmailBodyToText(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [{ selector: 'a', options: { ignoreHref: true } }, { selector: 'img', format: 'skip' }],
  })
}

/** Label-searches the sanitized body text for the brief's fields using the shared Romanian label dictionary. */
export function parseEmailBody(html: string, sourceRef?: string): ParseResult {
  const text = sanitizeEmailBodyToText(html)
  const fields = extractFieldsFromLabeledText(text, 'email_body', sourceRef)
  return { fields }
}
