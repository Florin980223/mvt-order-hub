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
 * Usage: npm run seed:test-sent-orders
 * Cleanup: see deletePreviousTestData() below, or run this script again
 * with ROW_COUNT=0 to just delete without reseeding.
 */

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

  const { error: ordersError } = await supabaseAdmin.from('orders').delete().in('email_id', emailIds)
  if (ordersError) throw new Error(`Failed to delete previous test orders: ${ordersError.message}`)

  const { error: emailsError } = await supabaseAdmin.from('emails').delete().in('id', emailIds)
  if (emailsError) throw new Error(`Failed to delete previous test emails: ${emailsError.message}`)

  console.log(`Deleted ${emailIds.length} previously-seeded test-sent-order row(s).`)
}

async function seedRow(n: number): Promise<void> {
  const clientName = `TEST - ${CLIENT_NAMES[n % CLIENT_NAMES.length]} ${String(n + 1).padStart(2, '0')}`
  const [pickupCity, deliveryCity] = CITY_PAIRS[n % CITY_PAIRS.length]
  const cargoType = CARGO_TYPES[n % CARGO_TYPES.length]

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
    })
    .select('id')
    .single()

  if (orderError || !orderRow) {
    throw new Error(`Failed to insert test order for ${graphMessageId}: ${orderError?.message}`)
  }

  const { error: eventError } = await supabaseAdmin.from('order_events').insert({
    order_id: orderRow.id as string,
    event_type: 'order_submitted',
    payload: { external_id: externalId, seeded: true },
    created_at: importedAt.toISOString(),
  })
  if (eventError) throw new Error(`Failed to insert order_events for ${graphMessageId}: ${eventError.message}`)
}

async function main(): Promise<void> {
  console.log('Deleting any previously seeded test-sent-order rows...')
  await deletePreviousTestData()

  if (ROW_COUNT === 0) {
    console.log('ROW_COUNT=0 — cleanup only, not reseeding.')
    return
  }

  console.log(`Seeding ${ROW_COUNT} test "imported" orders...`)
  for (let n = 0; n < ROW_COUNT; n++) {
    await seedRow(n)
  }
  console.log(`Done. Seeded ${ROW_COUNT} test-sent-order rows (prefix: ${MESSAGE_ID_PREFIX}).`)
}

main().catch((err) => {
  console.error('seed-test-sent-orders failed:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
