import type { ExtractedOrderFields } from './types.ts'

export interface AiFallbackContext {
  emailBodyText?: string
  attachmentTexts?: string[]
}

/**
 * Extension point for hybrid mode (roadmap: "AI fallback only for
 * missing/low-confidence fields"). No provider is implemented in Phase
 * 5a — no AI provider key exists yet — this interface exists so hybrid
 * mode can be added later without reshaping the deterministic parsers.
 */
export interface AiFallbackProvider {
  fillMissingFields(
    fields: ExtractedOrderFields,
    context: AiFallbackContext,
  ): Promise<Partial<ExtractedOrderFields>>
}

export const nullAiFallbackProvider: AiFallbackProvider = {
  async fillMissingFields() {
    return {}
  },
}
