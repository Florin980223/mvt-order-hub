/**
 * Local-only dev tooling: seeds ~30 obviously-fake "imported" orders
 * directly into emails/orders/order_events, purely so SentOrdersPage has
 * enough rows to exercise real multi-page pagination during development
 * review (figura4-comenzi-importate.png's "1 2 3 ... 20" pattern). These
 * are NOT real transport orders — every row is identifiable via the
 * `test-sent-order-` graph_message_id prefix and a "TEST - " client_name
 * prefix, and re-running this script deletes its own previous rows first
 * (same repeatable-seed pattern as seed-mock-emails.ts).
 *
 * Every row is fully populated (transport_amount, carrier_proposed, notes,
 * is_priority, updated_by, and a PDF+XLSX attachment pair uploaded to the
 * email-attachments bucket) — not just the bare minimum needed for the
 * list/pagination — so the detail panel (figura4's own field grid,
 * Atașamente card, Reply, Exportă PDF, and Vezi istoric import) all have
 * something real to render/export instead of "—" placeholders. Previously
 * this only set the handful of fields the list view itself reads
 * (client_order_number/client_name/route/cargo/imported_at), leaving every
 * seeded row's transport_amount/carrier_proposed/notes/updated_by/
 * attachments empty — fine for the list, but meant the detail panel and
 * "Filtrează" (Carrier propus/Valoare transport minimă/Prioritare, all
 * driven by those same fields) had nothing real to filter/show.
 *
 * Usage: npm run seed:test-sent-orders
 * Cleanup: see deletePreviousTestData() below, or run this script again
 * with ROW_COUNT=0 to just delete without reseeding.
 */

import { createHash } from 'node:crypto'
import { generateAttachmentBytes } from '../fixtures/generateAttachmentBytes.ts'
import { supabaseAdmin } from './lib/supabaseAdminClient.ts'

const MESSAGE_ID_PREFIX = 'test-sent-order-'
const ROW_COUNT = Number(process.env.ROW_COUNT ?? 30)

const CLIENT_NAMES = [
  'Atlas Trans SRL',
  'Bravo Logistics SRL',
  'Carpati Marfă SRL',
  'Delta Cargo SRL',
  'Estival Transport SRL',
  'Fortuna Distribution SRL',
  'Granit Logistics SRL',
  'Helios Trans SRL',
  'Ionex Marfă SRL',
  'Junctio Cargo SRL',
]

const CITY_PAIRS: Array<[string, string]> = [
  ['Cluj-Napoca', 'Hamburg'],
  ['Timișoara', 'București'],
  ['Iași', 'Brașov'],
  ['Oradea', 'Budapesta'],
  ['Constanța', 'Sofia'],
  ['Sibiu', 'Milano'],
  ['Galați', 'Wien'],
  ['Arad', 'Cluj-Napoca'],
  ['Craiova', 'Timișoara'],
  ['Ploiești', 'Varna'],
]

const CARGO_TYPES = [
  'Piese auto',
  'Cereale',
  'Materiale de construcție',
  'Marfă generală',
  'Produse agricole',
  'Echipamente industriale',
  'Oțel laminat',
]

// Real values for the fields the SentOrdersPage detail panel/Exportă PDF/
// "Filtrează" (Carrier propus, Valoare transport minimă, Prioritare) all
// read — see file header. Names/amounts are as fictional as everything
// else this script seeds.
const CARRIERS = [
  'DB Schenker Road',
  'DSV Road',
  'Kuehne+Nagel Road',
  'SC RapidCargo Trans SRL',
  'SC EuroWest Logistics SRL',
  'SC NordVest Trans SRL',
]

const NOTES = [
  'Comanda a fost importată cu succes în AscendTMS și confirmarea a fost trimisă clientului.',
  'Descărcare cu rampă, acces TIR.',
  'Transport frigorific, temperatura 2-4 grade C.',
  'Necesită macara la descărcare.',
  'Vamă UE, CMR și factură atașate.',
]

// One PDF + one XLSX generator per row, cycled — same generator pool
// fixtures/generateAttachmentBytes.ts already exposes for the mock-emails
// fixtures, reused here rather than duplicated. Matches figura4's own
// PO_450089.pdf + Anexa_450089.xlsx pair (one order doc, one annex).
const PDF_GENERATOR_REFS = ['materiale-constructii-pdf', 'textile-baia-mare-pdf', 'produse-chimice-deva-pdf']
const XLSX_GENERATOR_REFS = ['utilaje-agricole-xlsx', 'mobilier-birou-xlsx', 'utilaje-industriale-xlsx']

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Best-effort — grabs any existing profile so seeded rows' "Operator
 * import" resolves to a real name (matching figura4's "Andrei B.") instead
 * of staying null. Falls back to null (renders "—", same as before this
 * change) if the profiles table is empty, e.g. a fresh project with no
 * signed-up user yet — not worth failing the whole seed over.
 */
async function findDemoOperatorId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle()
  if (error || !data) return null
  return data.id as string
}

async function deletePreviousTestData(): Promise<void> {
  const { data: existingEmails, error } = await supabaseAdmin
    .from('emails')
    .select('id')
    .like('graph_message_id', `${MESSAGE_ID_PREFIX}%`)

  if (error) throw new Error(`Failed to look up previously-seeded test emails: ${error.message}`)

  const emailIds = (existingEmails ?? []).map((row) => row.id as string)
  if (emailIds.length === 0) return

  const { data: orderRows, error: orderLookupError } = await supabaseAdmin
    .from('orders')
    .select('id')
    .in('email_id', emailIds)
  if (orderLookupError) throw new Error(`Failed to look up previous test orders: ${orderLookupError.message}`)

  const orderIds = (orderRows ?? []).map((row) => row.id as string)
  if (orderIds.length > 0) {
    const { error: eventsError } = await supabaseAdmin.from('order_events').delete().in('order_id', orderIds)
    if (eventsError) throw new Error(`Failed to delete previous test order_events: ${eventsError.message}`)
  }

  // Storage objects (this run's PDF/XLSX attachment pairs) aren't covered
  // by the emails-table cascade below (that only deletes DB rows), so
  // they'd otherwise pile up under old email UUIDs on every re-run.
  // Best-effort — a missing/already-cleaned folder isn't worth failing
  // the whole reseed over.
  for (const emailId of emailIds) {
    const { data: files } = await supabaseAdmin.storage.from('email-attachments').list(emailId)
    if (files && files.length > 0) {
      await supabaseAdmin.storage.from('email-attachments').remove(files.map((file) => `${emailId}/${file.name}`))
    }
  }

  const { error: ordersError } = await supabaseAdmin.from('orders').delete().in('email_id', emailIds)
  if (ordersError) throw new Error(`Failed to delete previous test orders: ${ordersError.message}`)

  const { error: emailsError } = await supabaseAdmin.from('emails').delete().in('id', emailIds)
  if (emailsError) throw new Error(`Failed to delete previous test emails: ${emailsError.message}`)

  console.log(`Deleted ${emailIds.length} previously-seeded test-sent-order row(s).`)
}

async function seedRow(n: number, operatorId: string | null): Promise<void> {
  const clientName = `TEST - ${CLIENT_NAMES[n % CLIENT_NAMES.length]} ${String(n + 1).padStart(2, '0')}`
  const [pickupCity, deliveryCity] = CITY_PAIRS[n % CITY_PAIRS.length]
  const cargoType = CARGO_TYPES[n % CARGO_TYPES.length]
  const carrier = CARRIERS[n % CARRIERS.length]
  const note = NOTES[n % NOTES.length]
  // Every 3rd row priority, and a spread of transport values that
  // straddle both "Valoare transport minimă" thresholds (≥1.000/≥3.000
  // EUR) so that filter actually narrows the list instead of matching
  // everything or nothing.
  const isPriority = n % 3 === 0
  const transportAmount = 800 + (n % 12) * 350

  // Spread across the last 14 days, a few of them "today" for the
  // Importate azi tab, rest at varied past times for realistic density.
  const daysAgo = n < 4 ? 0 : Math.min(13, Math.floor((n - 4) / 2))
  const importedAt = new Date()
  importedAt.setDate(importedAt.getDate() - daysAgo)
  importedAt.setHours(8 + (n % 10), (n * 7) % 60, 0, 0)
  const receivedAt = new Date(importedAt.getTime() - 15 * 60 * 1000)

  const pickupAt = new Date(importedAt.getTime() - 3 * 24 * 60 * 60 * 1000)
  const deliveryAt = new Date(importedAt.getTime() - 1 * 24 * 60 * 60 * 1000)

  const graphMessageId = `${MESSAGE_ID_PREFIX}${String(n + 1).padStart(3, '0')}`

  const { data: emailRow, error: emailError } = await supabaseAdmin
    .from('emails')
    .insert({
      graph_message_id: graphMessageId,
      sender: 'test-sent-seed@mvt-test.local',
      subject: `[TEST DATA] Comandă transport ${pickupCity} - ${deliveryCity}`,
      body_html: '<p>[TEST DATA] Rând generat pentru testarea paginării SentOrdersPage.</p>',
      received_at: receivedAt.toISOString(),
      status: 'archived',
    })
    .select('id')
    .single()

  if (emailError || !emailRow) {
    throw new Error(`Failed to insert test email ${graphMessageId}: ${emailError?.message}`)
  }
  const emailId = emailRow.id as string

  const externalId = `STUB-${crypto.randomUUID()}`

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      email_id: emailId,
      client_order_number: `TST-2026-${String(n + 1).padStart(3, '0')}`,
      client_name: clientName,
      pickup_address: `Depozit ${pickupCity}, Str. Testare nr. ${n + 1}, ${pickupCity}`,
      pickup_at: pickupAt.toISOString(),
      delivery_address: `Punct livrare ${deliveryCity}, Str. Testare nr. ${n + 1}, ${deliveryCity}`,
      delivery_at: deliveryAt.toISOString(),
      cargo_type: cargoType,
      quantity: 5 + (n % 20),
      quantity_unit: 'paleți',
      weight_kg: 500 + n * 137,
      volume_m3: 5 + (n % 15),
      currency: 'EUR',
      confidence_overall: 0.95,
      status: 'imported',
      external_reference_id: externalId,
      imported_at: importedAt.toISOString(),
      transport_amount: transportAmount,
      carrier_proposed: carrier,
      notes: note,
      is_priority: isPriority,
      updated_by: operatorId,
    })
    .select('id')
    .single()

  if (orderError || !orderRow) {
    throw new Error(`Failed to insert test order for ${graphMessageId}: ${orderError?.message}`)
  }
  const orderId = orderRow.id as string

  const events: Array<{ order_id: string; event_type: string; payload: Record<string, unknown>; created_at: string }> = [
    {
      order_id: orderId,
      event_type: 'order_submitted',
      payload: { external_id: externalId, seeded: true },
      created_at: importedAt.toISOString(),
    },
  ]
  // Every other row also gets a confirmation_sent event, so the "Cu
  // confirmare trimisă" tab/count and "Vezi istoric import" panel both
  // have more than one seeded row/event to show, matching figura4's own
  // "92" count on that tab (a large chunk of, not all, imported orders).
  if (n % 2 === 0) {
    const confirmationAt = new Date(importedAt.getTime() + 10 * 60 * 1000)
    events.push({
      order_id: orderId,
      event_type: 'confirmation_sent',
      payload: { seeded: true },
      created_at: confirmationAt.toISOString(),
    })
  }

  const { error: eventError } = await supabaseAdmin.from('order_events').insert(events)
  if (eventError) throw new Error(`Failed to insert order_events for ${graphMessageId}: ${eventError.message}`)

  // Attachment pair (PDF + XLSX), same PO_/Anexa_ naming figura4 shows —
  // uploaded for real to the email-attachments bucket (not just a DB row)
  // so "Deschide"/the signed-url flow in PendingOrderAttachments actually
  // works, not just renders a filename.
  const orderNumber = `TST-2026-${String(n + 1).padStart(3, '0')}`
  const attachmentDefs = [
    {
      filename: `PO_${orderNumber}.pdf`,
      mimeType: 'application/pdf',
      generatorRef: PDF_GENERATOR_REFS[n % PDF_GENERATOR_REFS.length],
    },
    {
      filename: `Anexa_${orderNumber}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      generatorRef: XLSX_GENERATOR_REFS[n % XLSX_GENERATOR_REFS.length],
    },
  ]

  for (const def of attachmentDefs) {
    const bytes = await generateAttachmentBytes(def.generatorRef)
    const sha256 = sha256Hex(bytes)
    const storagePath = `${emailId}/${def.filename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('email-attachments')
      .upload(storagePath, bytes, { contentType: def.mimeType, upsert: true })
    if (uploadError) {
      throw new Error(`Failed to upload attachment ${def.filename} for ${graphMessageId}: ${uploadError.message}`)
    }

    const { error: attachmentError } = await supabaseAdmin.from('email_attachments').insert({
      email_id: emailId,
      filename: def.filename,
      mime_type: def.mimeType,
      size: bytes.byteLength,
      storage_path: storagePath,
      sha256,
    })
    if (attachmentError) {
      throw new Error(`Failed to insert email_attachments row for ${def.filename}: ${attachmentError.message}`)
    }
  }
}

async function main(): Promise<void> {
  console.log('Deleting any previously seeded test-sent-order rows...')
  await deletePreviousTestData()

  if (ROW_COUNT === 0) {
    console.log('ROW_COUNT=0 — cleanup only, not reseeding.')
    return
  }

  const operatorId = await findDemoOperatorId()
  console.log(operatorId ? `Using profile ${operatorId} for Operator import.` : 'No profile found — Operator import will show "—".')

  console.log(`Seeding ${ROW_COUNT} test "imported" orders...`)
  for (let n = 0; n < ROW_COUNT; n++) {
    await seedRow(n, operatorId)
  }
  console.log(`Done. Seeded ${ROW_COUNT} test-sent-order rows (prefix: ${MESSAGE_ID_PREFIX}).`)
}

main().catch((err) => {
  console.error('seed-test-sent-orders failed:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
