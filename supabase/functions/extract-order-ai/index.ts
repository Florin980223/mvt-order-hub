import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
import { extractText, getDocumentProxy } from 'npm:unpdf@1.8.0'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'
import { sanitizeEmailBodyToText } from '../_shared/emailBodyText.ts'
import { ORDER_FIELD_SECTIONS, latestSourceFor } from '../../../src/lib/orders/orderFields.ts'
import type { OrderFieldSourceRow } from '../../../src/lib/emails/types.ts'

// Mirrors correct-order-fields'/ActionBar's PRE_IMPORT_STATUSES — AI
// re-extraction only makes sense while an order hasn't left the review
// stage yet, same rule the server already enforces for manual correction.
const PRE_IMPORT_STATUSES = ['draft', 'needs_validation', 'ready_to_import', 'import_failed']

// Falls back to this if app_settings' confidence_threshold row is missing —
// matches DEFAULT_CONFIDENCE_THRESHOLD in
// src/lib/settings/useConfidenceThresholdQuery.ts (not imported directly:
// that module pulls in the React Query hook, which Deno can't resolve).
const DEFAULT_CONFIDENCE_THRESHOLD = 0.85

const OPENAI_MODEL = 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

// Every ORDER_FIELD_SECTIONS field that tracks confidence — the 15 leaf
// columns extraction ever populates (excludes external_reference_id, which
// is submission metadata, not an extracted field). Reused as-is rather than
// re-listing the 15 field names by hand.
const AI_FIELDS = ORDER_FIELD_SECTIONS.flatMap((section) => section.fields).filter(
  (field) => field.trackConfidence !== false,
)

const NUMBER_FIELDS = new Set(['quantity', 'weight_kg', 'volume_m3', 'transport_amount'])
const DATE_FIELDS = new Set(['pickup_at', 'delivery_at'])
const CURRENCY_RE = /^[A-Za-z]{3}$/

// Keeps prompt size (and cost) bounded — a manually-triggered re-extraction
// doesn't need the entire document, just enough to find the missing fields.
const MAX_CONTEXT_CHARS = 6000
const MIN_PDF_TEXT_CHARS = 20

interface ExtractOrderAiPayload {
  order_id: string
}

interface AiFieldGuess {
  value: string | number | null
  confidence?: number
}

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}\n[...trunchiat]` : text
}

interface AttachmentRow {
  filename: string
  mime_type: string
  storage_path: string
}

/** Best-effort raw text for AI context — mirrors the digital-PDF branch of src/lib/extraction/pdfParser.ts, but returns raw text instead of label-matched fields. A single unreadable attachment must not abort the whole request. */
async function extractAttachmentText(supabase: SupabaseClient, attachment: AttachmentRow): Promise<string | null> {
  const isPdf = attachment.mime_type === 'application/pdf' || attachment.filename.endsWith('.pdf')
  const isCsv = attachment.mime_type === 'text/csv' || attachment.filename.endsWith('.csv')
  if (!isPdf && !isCsv) return null

  const { data: blob, error } = await supabase.storage.from('email-attachments').download(attachment.storage_path)
  if (error || !blob) return null

  try {
    if (isCsv) {
      return new TextDecoder().decode(await blob.arrayBuffer())
    }

    const bytes = Buffer.from(await blob.arrayBuffer())
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const { text } = await extractText(pdf, { mergePages: true })
    return text.trim().length >= MIN_PDF_TEXT_CHARS ? text : null
  } catch (err) {
    console.error(`extract-order-ai: failed to read attachment ${attachment.filename}:`, err instanceof Error ? err.message : err)
    return null
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  let payload: ExtractOrderAiPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.order_id) {
    return jsonResponse({ error: 'order_id is required' }, 400)
  }

  const supabase = serviceClient()
  let jobId: string | null = null

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }
    const userId = userData.user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return jsonResponse(
        {
          error:
            'OPENAI_API_KEY nu este configurat — adăugați-l ca secret pentru Edge Functions (supabase secrets set OPENAI_API_KEY=...) pentru a activa extragerea AI.',
        },
        500,
      )
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `id, status, email_id, client_order_number, client_name, pickup_address, pickup_at,
         delivery_address, delivery_at, cargo_type, quantity, quantity_unit, weight_kg, volume_m3,
         transport_amount, currency, carrier_proposed, notes,
         order_field_sources (field_name, source_type, source_ref, confidence, created_at)`,
      )
      .eq('id', payload.order_id)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) {
      return jsonResponse({ error: 'order not found' }, 404)
    }
    if (!PRE_IMPORT_STATUSES.includes(order.status)) {
      return jsonResponse({ error: `order status '${order.status}' cannot be re-extracted` }, 409)
    }

    const orderData = order as unknown as Record<string, unknown> & { order_field_sources: OrderFieldSourceRow[] }

    const { data: thresholdSetting } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', 'confidence_threshold')
      .maybeSingle()
    const confidenceThreshold =
      (thresholdSetting?.value_json as { threshold?: number } | null)?.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD

    const fieldsToFill = AI_FIELDS.filter((field) => {
      const currentValue = orderData[field.fieldName]
      const source = latestSourceFor(orderData.order_field_sources, field.fieldName)
      const confidence = source?.confidence ?? 0
      return currentValue === null || currentValue === undefined || confidence < confidenceThreshold
    })

    if (fieldsToFill.length === 0) {
      return jsonResponse({ status: 'no_changes', fields_updated: [] }, 200)
    }

    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('body_html, body_text')
      .eq('id', orderData.email_id as string)
      .maybeSingle()
    if (emailError) throw new Error(emailError.message)

    const bodyText = email?.body_text ?? (email?.body_html ? sanitizeEmailBodyToText(email.body_html) : null)

    const { data: attachments } = await supabase
      .from('email_attachments')
      .select('filename, mime_type, storage_path')
      .eq('email_id', orderData.email_id as string)

    const attachmentTexts: string[] = []
    for (const attachment of (attachments ?? []) as AttachmentRow[]) {
      const text = await extractAttachmentText(supabase, attachment)
      if (text) attachmentTexts.push(`--- ${attachment.filename} ---\n${truncate(text, MAX_CONTEXT_CHARS)}`)
    }

    const contextSections = [
      bodyText ? `Corp email:\n${truncate(bodyText, MAX_CONTEXT_CHARS)}` : null,
      ...attachmentTexts,
    ].filter((section): section is string => Boolean(section))

    if (contextSections.length === 0) {
      return jsonResponse({ status: 'no_text_available', fields_updated: [] }, 200)
    }

    const knownFields = Object.fromEntries(
      AI_FIELDS.filter((field) => !fieldsToFill.includes(field)).map((field) => [field.fieldName, orderData[field.fieldName]]),
    )

    const requestedFieldsDescription = fieldsToFill
      .map((field) => {
        if (NUMBER_FIELDS.has(field.fieldName)) return `${field.fieldName} (${field.label}) — număr`
        if (DATE_FIELDS.has(field.fieldName)) return `${field.fieldName} (${field.label}) — dată/oră ISO 8601`
        if (field.fieldName === 'currency') return `${field.fieldName} (${field.label}) — cod valută ISO pe 3 litere`
        return `${field.fieldName} (${field.label}) — text`
      })
      .join('\n')

    const systemPrompt =
      'Ești un asistent de extragere de date pentru un sistem de gestiune a comenzilor de transport din România. ' +
      'Primești textul unui email (și, opțional, al atașamentelor) care descrie o comandă de transport, plus o listă ' +
      'de câmpuri pe care un parser determinist NU a putut să le extragă cu suficientă încredere. Extrage DOAR acele ' +
      'câmpuri din text. Nu inventa valori — dacă un câmp chiar nu apare în text, omite-l din răspuns. Răspunde ' +
      'STRICT ca obiect JSON valid, fără text în afara lui, cu forma: {"<nume_câmp>": {"value": <string|number>, ' +
      '"confidence": <număr 0..1>}, ...}. Include doar câmpurile din listă pentru care ai găsit o valoare reală.'

    const userPrompt = [
      `Câmpuri de extras:\n${requestedFieldsDescription}`,
      `Câmpuri deja cunoscute (context, nu le re-extrage):\n${JSON.stringify(knownFields)}`,
      `Conținut sursă:\n${contextSections.join('\n\n')}`,
    ].join('\n\n')

    const jobInsert = await supabase
      .from('extraction_jobs')
      .insert({ email_id: orderData.email_id as string, mode: 'ai', status: 'pending' })
      .select('id')
      .single()
    if (jobInsert.error || !jobInsert.data) {
      throw new Error(jobInsert.error?.message ?? 'failed to create extraction_jobs row')
    }
    jobId = jobInsert.data.id
    await supabase
      .from('extraction_jobs')
      .update({ status: 'running', attempts: 1, started_at: new Date().toISOString() })
      .eq('id', jobId)

    const aiResponse = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      throw new Error(`OpenAI request failed (${aiResponse.status}): ${errorText.slice(0, 500)}`)
    }

    const aiBody = await aiResponse.json()
    const content: string | undefined = aiBody?.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI response had no message content')
    }

    let parsed: Record<string, AiFieldGuess>
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('OpenAI response was not valid JSON')
    }

    const columnUpdates: Record<string, string | number> = {}
    const fieldSourceInserts: { field_name: string; source_type: 'ai'; source_ref: string | null; confidence: number }[] = []
    const oldData: Record<string, unknown> = {}
    const newData: Record<string, unknown> = {}

    for (const field of fieldsToFill) {
      const guess = parsed[field.fieldName]
      if (!guess || guess.value === null || guess.value === undefined || guess.value === '') continue

      let coerced: string | number | null = null

      if (NUMBER_FIELDS.has(field.fieldName)) {
        const num = typeof guess.value === 'number' ? guess.value : Number(String(guess.value).replace(',', '.'))
        if (Number.isFinite(num)) coerced = num
      } else if (DATE_FIELDS.has(field.fieldName)) {
        const date = new Date(String(guess.value))
        if (!Number.isNaN(date.getTime())) coerced = date.toISOString()
      } else if (field.fieldName === 'currency') {
        const currency = String(guess.value).trim().toUpperCase()
        if (CURRENCY_RE.test(currency)) coerced = currency
      } else {
        const text = String(guess.value).trim()
        if (text) coerced = text
      }

      if (coerced === null) continue

      const confidence = typeof guess.confidence === 'number' && Number.isFinite(guess.confidence)
        ? Math.min(1, Math.max(0, guess.confidence))
        : 0.6

      columnUpdates[field.fieldName] = coerced
      fieldSourceInserts.push({
        field_name: field.fieldName,
        source_type: 'ai',
        source_ref: `openai:${OPENAI_MODEL}`,
        confidence,
      })
      oldData[field.fieldName] = orderData[field.fieldName]
      newData[field.fieldName] = coerced
    }

    if (fieldSourceInserts.length === 0) {
      await supabase
        .from('extraction_jobs')
        .update({ status: 'succeeded', finished_at: new Date().toISOString() })
        .eq('id', jobId)
      return jsonResponse({ status: 'no_new_data', fields_updated: [] }, 200)
    }

    // confidence_overall mirrors mapToOrderRow.ts's formula: the mean
    // confidence across all 15 leaf fields, untouched fields keeping their
    // existing latest source confidence (0 if they still have none).
    const confidenceByField = new Map<string, number>(
      fieldSourceInserts.map((source) => [source.field_name, source.confidence]),
    )
    const overallConfidence =
      AI_FIELDS.reduce((sum, field) => {
        if (confidenceByField.has(field.fieldName)) return sum + confidenceByField.get(field.fieldName)!
        const source = latestSourceFor(orderData.order_field_sources, field.fieldName)
        return sum + (source?.confidence ?? 0)
      }, 0) / AI_FIELDS.length

    const { error: updateError } = await supabase
      .from('orders')
      .update({ ...columnUpdates, confidence_overall: Math.round(overallConfidence * 1000) / 1000 })
      .eq('id', payload.order_id)
    if (updateError) throw new Error(updateError.message)

    const { error: sourcesError } = await supabase.from('order_field_sources').insert(
      fieldSourceInserts.map((source) => ({ order_id: payload.order_id, ...source })),
    )
    if (sourcesError) {
      throw new Error(
        `orders row was updated but order_field_sources insert failed — AI extraction is INCOMPLETE: ${sourcesError.message}`,
      )
    }

    await supabase
      .from('extraction_jobs')
      .update({ status: 'succeeded', finished_at: new Date().toISOString() })
      .eq('id', jobId)

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'ai_extract',
        entity: 'orders',
        entity_id: payload.order_id,
        old_data: oldData,
        new_data: newData,
      })
    } catch (auditErr) {
      console.error('extract-order-ai audit log error:', (auditErr as Error).message)
    }

    return jsonResponse({ status: 'extracted', fields_updated: fieldSourceInserts.map((source) => source.field_name) }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('extract-order-ai error:', errorMessage)

    if (jobId) {
      await supabase
        .from('extraction_jobs')
        .update({ status: 'failed', error: errorMessage, finished_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    return jsonResponse({ error: errorMessage }, 500)
  }
})
