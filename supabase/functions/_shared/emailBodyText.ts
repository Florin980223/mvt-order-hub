// Deno-native copy of src/lib/extraction/emailBodyParser.ts's
// sanitizeEmailBodyToText ONLY — extract-order-ai needs just this one
// function, not the full parseEmailBody label-extraction path.
//
// Why this file exists instead of importing the frontend module directly:
// extract-order-ai/index.ts previously imported sanitizeEmailBodyToText from
// the src/lib/extraction barrel (index.ts). That barrel does
// `export * from './types.ts'` plus `export { ... } from './csvParser.ts'`,
// `'./xlsxParser.ts'`, `'./pdfParser.ts'`, `'./mergeFieldSources.ts'`,
// `'./mapToOrderRow.ts'`, `'./aiFallback.ts'` — so importing ANY single name
// from the barrel pulls the ENTIRE module graph into the hosted deploy
// bundler's dependency graph, including papaparse (csvParser.ts), exceljs
// (xlsxParser.ts), unpdf (pdfParser.ts) and html-to-text
// (emailBodyParser.ts) as bare npm specifiers. Those are valid in the
// Vite/browser build (and resolved locally under `supabase functions serve`
// via supabase/functions/deno.json's import map) but the hosted
// `supabase functions deploy` bundler rejects bare specifiers outright — this
// is exactly what broke first on a bare `unpdf` import in this function's own
// code, and then again transitively on `html-to-text` via
// emailBodyParser.ts. Duplicating just this one small function here, with an
// explicit `npm:` specifier (same style already used for unpdf below in
// index.ts, and the same pinned version as supabase/functions/deno.json),
// sidesteps the barrel entirely instead of relying on import-map
// auto-discovery, which is not reliably applied by the hosted bundler.
//
// Do NOT import this from src/lib/extraction/*.ts (the frontend/Vite copy
// stays bare-specifier, unmodified) and do NOT re-add a barrel import here.
import { convert } from 'npm:html-to-text@9.0.5'

/**
 * Sanitizes an email's HTML body down to plain text — html-to-text strips
 * every tag, so the output can carry no markup. Mirrors
 * src/lib/extraction/emailBodyParser.ts's sanitizeEmailBodyToText exactly
 * (same options), kept in sync by hand since it's a ~5-line function.
 */
export function sanitizeEmailBodyToText(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [{ selector: 'a', options: { ignoreHref: true } }, { selector: 'img', format: 'skip' }],
  })
}
