/**
 * Local-only dev tooling: seeds the mock Romanian transport-order
 * fixtures into emails/email_attachments/orders/order_field_sources/
 * extraction_jobs, running the deterministic parsers exactly as the
 * future Edge Function orchestrator will. Never imported from src/.
 *
 * Usage: npm run seed:mock-emails
 */

import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { generateAttachmentBytes } from '../fixtures/generateAttachmentBytes.ts'
import {
  mapToOrderRow,
  mergeParseResults,
  parseCsv,
  parseEmailBody,
  parsePdf,
  parseXlsx,
  sanitizeEmailBodyToText,
} from '../src/lib/extraction/index.ts'
import type { ParseResult } from '../src/lib/extraction/index.ts'
import { supabaseAdmin } from './lib/supabaseAdminClient.ts'

const STATUS_CONFIDENCE_THRESHOLD = 0.85
const MOCK_MESSAGE_ID_PREFIX = 'mock-'
const FIXTURES_DIR = path.resolve(process.cwd(), 'fixtures/mock-emails')

interface AttachmentDef {
  filename: string
  mimeType: string
  generatorRef: string
}

interface MockEmailFixture {
  graphMessageId: string
  sender: string
  subject: string
  receivedAt: string
  bodyHtml: string
  attachments: AttachmentDef[]
}

interface SeedSummaryRow {
  subject: string
  emailStatus: string
  orderStatus: string
  confidenceOverall: number
  needsOcr: boolean
}

async function loadFixtures(): Promise<MockEmailFixture[]> {
  const files = (await readdir(FIXTURES_DIR)).filter((file) => file.endsWith('.json')).sort()
  const fixtures: MockEmailFixture[] = []
  for (const file of files) {
    const raw = await readFile(path.join(FIXTURES_DIR, file), 'utf-8')
    fixtures.push(JSON.parse(raw) as MockEmailFixture)
  }
  return fixtures
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Removes any previously-seeded mock rows so the script can be re-run repeatably. */
async function deletePreviousMockData(): Promise<void> {
  const { data: existingEmails, error } = await supabaseAdmin
    .from('emails')
    .select('id')
    .like('graph_message_id', `${MOCK_MESSAGE_ID_PREFIX}%`)

  if (error) throw new Error(`Failed to look up previously-seeded mock emails: ${error.message}`)

  const emailIds = (existingEmails ?? []).map((row) => row.id as string)
  if (emailIds.length === 0) return

  // orders -> restrict on emails, so it must go first; order_field_sources
  // cascades with orders, email_attachments/extraction_jobs cascade with emails.
  const { error: ordersError } = await supabaseAdmin.from('orders').delete().in('email_id', emailIds)
  if (ordersError) throw new Error(`Failed to delete previous mock orders: ${ordersError.message}`)

  const { error: emailsError } = await supabaseAdmin.from('emails').delete().in('id', emailIds)
  if (emailsError) throw new Error(`Failed to delete previous mock emails: ${emailsError.message}`)
}

async function parseAttachment(def: AttachmentDef, bytes: Buffer): Promise<ParseResult> {
  if (def.mimeType === 'text/csv' || def.filename.endsWith('.csv')) {
    return parseCsv(bytes, def.filename)
  }
  if (def.mimeType.includes('spreadsheet') || def.filename.endsWith('.xlsx')) {
    return parseXlsx(bytes, def.filename)
  }
  if (def.mimeType === 'application/pdf' || def.filename.endsWith('.pdf')) {
    return parsePdf(bytes, def.filename)
  }
  throw new Error(`No parser registered for attachment mime type: ${def.mimeType}`)
}

async function processFixture(fixture: MockEmailFixture): Promise<SeedSummaryRow> {
  const { data: emailRow, error: emailError } = await supabaseAdmin
    .from('emails')
    .insert({
      graph_message_id: fixture.graphMessageId,
      sender: fixture.sender,
      subject: fixture.subject,
      body_html: fixture.bodyHtml,
      body_text: sanitizeEmailBodyToText(fixture.bodyHtml),
      received_at: fixture.receivedAt,
      status: 'new',
    })
    .select('id')
    .single()

  if (emailError || !emailRow) {
    throw new Error(`Failed to insert email for ${fixture.graphMessageId}: ${emailError?.message}`)
  }
  const emailId = emailRow.id as string

  const { data: jobRow, error: jobInsertError } = await supabaseAdmin
    .from('extraction_jobs')
    .insert({ email_id: emailId, mode: 'javascript', status: 'pending' })
    .select('id')
    .single()

  if (jobInsertError || !jobRow) {
    throw new Error(`Failed to create extraction_jobs row for ${fixture.graphMessageId}: ${jobInsertError?.message}`)
  }
  const jobId = jobRow.id as string

  await supabaseAdmin
    .from('extraction_jobs')
    .update({ status: 'running', attempts: 1, started_at: new Date().toISOString() })
    .eq('id', jobId)

  try {
    const attachmentResults: ParseResult[] = []
    for (const attachmentDef of fixture.attachments) {
      const bytes = await generateAttachmentBytes(attachmentDef.generatorRef)
      const sha256 = sha256Hex(bytes)
      const storagePath = `${emailId}/${attachmentDef.filename}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('email-attachments')
        .upload(storagePath, bytes, { contentType: attachmentDef.mimeType, upsert: true })

      if (uploadError) {
        throw new Error(`Failed to upload attachment ${attachmentDef.filename}: ${uploadError.message}`)
      }

      const { error: attachmentInsertError } = await supabaseAdmin.from('email_attachments').insert({
        email_id: emailId,
        filename: attachmentDef.filename,
        mime_type: attachmentDef.mimeType,
        size: bytes.byteLength,
        storage_path: storagePath,
        sha256,
      })

      if (attachmentInsertError) {
        throw new Error(
          `Failed to insert email_attachments row for ${attachmentDef.filename}: ${attachmentInsertError.message}`,
        )
      }

      attachmentResults.push(await parseAttachment(attachmentDef, bytes))
    }

    const bodyResult = parseEmailBody(fixture.bodyHtml, 'body')
    const merged = mergeParseResults([bodyResult, ...attachmentResults])

    if (merged.needsOcr && merged.fields.notes.value === null) {
      merged.fields.notes = {
        value: 'PDF pare scanat (fără strat de text) — necesită introducere manuală sau OCR.',
        confidence: 1,
        sourceType: 'pdf',
        sourceRef: fixture.attachments.find((attachment) => attachment.mimeType === 'application/pdf')?.filename,
      }
    }

    const { orderRow, fieldSources } = mapToOrderRow(merged.fields)

    const emailStatus =
      orderRow.confidence_overall >= STATUS_CONFIDENCE_THRESHOLD && !merged.needsOcr ? 'extracted' : 'needs_validation'
    const orderStatus = 'needs_validation'

    const { data: insertedOrder, error: orderInsertError } = await supabaseAdmin
      .from('orders')
      .insert({ email_id: emailId, status: orderStatus, ...orderRow })
      .select('id')
      .single()

    if (orderInsertError || !insertedOrder) {
      throw new Error(`Failed to insert order for ${fixture.graphMessageId}: ${orderInsertError?.message}`)
    }
    const orderId = insertedOrder.id as string

    if (fieldSources.length > 0) {
      const { error: fieldSourcesError } = await supabaseAdmin
        .from('order_field_sources')
        .insert(fieldSources.map((fieldSource) => ({ order_id: orderId, ...fieldSource })))

      if (fieldSourcesError) {
        throw new Error(
          `Failed to insert order_field_sources for ${fixture.graphMessageId}: ${fieldSourcesError.message}`,
        )
      }
    }

    const { error: emailUpdateError } = await supabaseAdmin
      .from('emails')
      .update({ status: emailStatus })
      .eq('id', emailId)

    if (emailUpdateError) {
      throw new Error(`Failed to update emails.status for ${fixture.graphMessageId}: ${emailUpdateError.message}`)
    }

    await supabaseAdmin
      .from('extraction_jobs')
      .update({ status: 'succeeded', finished_at: new Date().toISOString() })
      .eq('id', jobId)

    return {
      subject: fixture.subject,
      emailStatus,
      orderStatus,
      confidenceOverall: orderRow.confidence_overall,
      needsOcr: merged.needsOcr ?? false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabaseAdmin
      .from('extraction_jobs')
      .update({ status: 'failed', error: message, finished_at: new Date().toISOString() })
      .eq('id', jobId)
    throw err
  }
}

async function main(): Promise<void> {
  const fixtures = await loadFixtures()
  console.log(`Loaded ${fixtures.length} mock email fixtures.`)

  console.log('Deleting any previously seeded mock data...')
  await deletePreviousMockData()

  const summary: SeedSummaryRow[] = []
  for (const fixture of fixtures) {
    console.log(`Processing ${fixture.graphMessageId} (${fixture.subject})...`)
    try {
      summary.push(await processFixture(fixture))
    } catch (err) {
      console.error(`  Failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('\nSummary:')
  console.table(
    summary.map((row) => ({
      Subject: row.subject,
      'Email status': row.emailStatus,
      'Order status': row.orderStatus,
      'Confidence overall': row.confidenceOverall,
      'Needs OCR': row.needsOcr,
    })),
  )
}

main().catch((err) => {
  console.error('seed-mock-emails failed:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
