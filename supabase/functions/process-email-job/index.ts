import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
import {
  mapToOrderRow,
  mergeParseResults,
  parseCsv,
  parseEmailBody,
  parsePdf,
  parseXlsx,
  sanitizeEmailBodyToText,
} from '../../../src/lib/extraction/index.ts'
import type { ParseResult } from '../../../src/lib/extraction/index.ts'

const STATUS_CONFIDENCE_THRESHOLD = 0.85

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

interface ProcessEmailJobPayload {
  email_id: string
}

interface AttachmentRow {
  filename: string
  mime_type: string
  storage_path: string
  sha256: string
}

/** Unrecognized attachment types (images, .docx, etc.) return null rather than throwing — a single unparseable attachment must not abort the whole job. */
async function parseAttachment(supabase: SupabaseClient, attachment: AttachmentRow): Promise<ParseResult | null> {
  const isCsv = attachment.mime_type === 'text/csv' || attachment.filename.endsWith('.csv')
  const isXlsx = attachment.mime_type.includes('spreadsheet') || attachment.filename.endsWith('.xlsx')
  const isPdf = attachment.mime_type === 'application/pdf' || attachment.filename.endsWith('.pdf')

  if (!isCsv && !isXlsx && !isPdf) return null

  const { data: blob, error } = await supabase.storage.from('email-attachments').download(attachment.storage_path)
  if (error || !blob) {
    console.error(`process-email-job: failed to download attachment ${attachment.storage_path}:`, error?.message)
    return null
  }

  const bytes = Buffer.from(await blob.arrayBuffer())

  try {
    if (isCsv) return parseCsv(bytes, attachment.filename)
    if (isXlsx) return await parseXlsx(bytes, attachment.filename)
    return await parsePdf(bytes, attachment.filename)
  } catch (err) {
    console.error(
      `process-email-job: failed to parse attachment ${attachment.filename}:`,
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

Deno.serve(async (req) => {
  let payload: ProcessEmailJobPayload

  try {
    payload = await req.json()
  } catch {
    return new Response('invalid payload', { status: 400 })
  }

  const supabase = serviceClient()
  let jobId: string | null = null

  try {
    const { data: job, error: jobInsertError } = await supabase
      .from('extraction_jobs')
      .insert({ email_id: payload.email_id, mode: 'javascript', status: 'pending' })
      .select('id')
      .single()
    if (jobInsertError || !job) {
      throw new Error(jobInsertError?.message ?? 'failed to create extraction_jobs row')
    }
    jobId = job.id

    await supabase
      .from('extraction_jobs')
      .update({ status: 'running', attempts: 1, started_at: new Date().toISOString() })
      .eq('id', jobId)

    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('body_html')
      .eq('id', payload.email_id)
      .single()
    if (emailError || !email) {
      throw new Error(emailError?.message ?? 'email row not found')
    }

    const { data: attachments, error: attachmentsError } = await supabase
      .from('email_attachments')
      .select('filename, mime_type, storage_path, sha256')
      .eq('email_id', payload.email_id)
    if (attachmentsError) {
      throw new Error(attachmentsError.message)
    }

    const attachmentResults: ParseResult[] = []
    for (const attachment of (attachments ?? []) as AttachmentRow[]) {
      const result = await parseAttachment(supabase, attachment)
      if (result) attachmentResults.push(result)
    }

    const bodyHtml: string | null = email.body_html
    const bodyText = bodyHtml ? sanitizeEmailBodyToText(bodyHtml) : null
    const bodyResult = bodyHtml ? parseEmailBody(bodyHtml, 'body') : null
    const merged = mergeParseResults(bodyResult ? [bodyResult, ...attachmentResults] : attachmentResults)

    // Scanned/image PDF (no extractable text layer) — mark per brief 5.2's
    // rule rather than leaving the order silently blank; OCR itself is out
    // of scope until a provider is chosen.
    if (merged.needsOcr && merged.fields.notes.value === null) {
      merged.fields.notes = {
        value: 'PDF pare scanat (fără strat de text) — necesită introducere manuală sau OCR.',
        confidence: 1,
        sourceType: 'pdf',
      }
    }

    // Brief 6.4 duplicate-detection signal: an identical attachment (by
    // content hash) already belonging to an imported/importing order is a
    // soft warning, not a block — a supplier legitimately resending the
    // same PDF for a follow-up order is a real, non-error case. The hard
    // block (same client_order_number + client_name already
    // imported/importing) lives in submit-order instead.
    const attachmentShas = ((attachments ?? []) as AttachmentRow[]).map((a) => a.sha256)
    if (attachmentShas.length > 0) {
      const { data: shaMatches } = await supabase
        .from('email_attachments')
        .select('email_id')
        .in('sha256', attachmentShas)
        .neq('email_id', payload.email_id)

      const otherEmailIds = [...new Set((shaMatches ?? []).map((m) => m.email_id as string))]
      const { data: matchingOrders } = otherEmailIds.length
        ? await supabase.from('orders').select('id').in('email_id', otherEmailIds).in('status', ['imported', 'importing'])
        : { data: [] as { id: string }[] }

      if ((matchingOrders ?? []).length > 0) {
        const warning =
          'Atenție: unul dintre atașamente este identic (după conținut) cu un atașament dintr-o comandă deja importată — verificați posibilul duplicat.'
        merged.fields.notes = {
          value: merged.fields.notes.value ? `${merged.fields.notes.value}\n${warning}` : warning,
          confidence: merged.fields.notes.value !== null ? merged.fields.notes.confidence : 1,
          sourceType: merged.fields.notes.sourceType,
          sourceRef: merged.fields.notes.sourceRef,
        }
      }
    }

    const { orderRow, fieldSources } = mapToOrderRow(merged.fields)

    const { data: insertedOrder, error: orderInsertError } = await supabase
      .from('orders')
      .insert({ email_id: payload.email_id, status: 'needs_validation', ...orderRow })
      .select('id')
      .single()
    if (orderInsertError || !insertedOrder) {
      throw new Error(orderInsertError?.message ?? 'failed to insert order')
    }

    if (fieldSources.length > 0) {
      const { error: fieldSourcesError } = await supabase.from('order_field_sources').insert(
        fieldSources.map((fieldSource) => ({
          order_id: insertedOrder.id,
          ...fieldSource,
        })),
      )
      if (fieldSourcesError) {
        throw new Error(fieldSourcesError.message)
      }
    }

    const emailStatus =
      orderRow.confidence_overall >= STATUS_CONFIDENCE_THRESHOLD && !merged.needsOcr ? 'extracted' : 'needs_validation'

    const { error: emailUpdateError } = await supabase
      .from('emails')
      .update({ status: emailStatus, body_text: bodyText })
      .eq('id', payload.email_id)
    if (emailUpdateError) {
      throw new Error(emailUpdateError.message)
    }

    await supabase
      .from('extraction_jobs')
      .update({ status: 'succeeded', finished_at: new Date().toISOString() })
      .eq('id', jobId)

    return new Response(null, { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('process-email-job error:', errorMessage)

    if (jobId) {
      await supabase
        .from('extraction_jobs')
        .update({ status: 'failed', error: errorMessage, finished_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Best-effort — an email stuck at 'processing' forever is worse than
    // one visibly needing validation.
    try {
      await supabase.from('emails').update({ status: 'needs_validation' }).eq('id', payload.email_id)
    } catch (fallbackErr) {
      console.error(
        'process-email-job fallback status update error:',
        fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
      )
    }

    return new Response(null, { status: 500 })
  }
})
