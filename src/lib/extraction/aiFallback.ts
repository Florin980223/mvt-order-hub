import type { ExtractedOrderFields } from './types.ts'

export interface AiFallbackContext {
  emailBodyText?: string
  attachmentTexts?: string[]
}

/**
 * Extension point for *automatic* hybrid mode inside process-email-job
 * (roadmap: "AI fallback only for missing/low-confidence fields"), i.e.
 * folding an AI pass into the initial deterministic extraction merge.
 * Still unimplemented — no provider was wired into this interface.
 *
 * The manually-triggered "Extrage Automat cu AI" button is a separate,
 * already-implemented feature: it calls the new `extract-order-ai` Edge
 * Function directly (supabase/functions/extract-order-ai/index.ts), which
 * makes a real OpenAI call (OPENAI_API_KEY) to fill an existing order's
 * missing/low-confidence fields on demand. It doesn't go through this
 * provider interface, since it operates on an already-created order
 * rather than during the initial parse/merge this interface targets.
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
