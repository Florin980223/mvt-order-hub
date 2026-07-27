import { createClient } from 'npm:@supabase/supabase-js@2'
import Papa from 'papaparse'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'

const PAGE_SIZE = 1000

interface GenerateReportPayload {
  from: string
  to: string
  status?: string[]
  client_name?: string
}

interface OrderForReport {
  id: string
  client_order_number: string | null
  client_name: string | null
  pickup_address: string | null
  pickup_at: string | null
  delivery_address: string | null
  delivery_at: string | null
  carrier_proposed: string | null
  transport_amount: number | null
  currency: string
  confidence_overall: number | null
  status: string
  external_reference_id: string | null
  imported_at: string | null
}

interface EmailForReport {
  received_at: string
  sender: string
  subject: string | null
  status: string
  orders: OrderForReport[]
}

const EMAIL_STATUS_LABELS: Record<string, string> = {
  new: 'Nou',
  queued: 'În coadă',
  processing: 'În procesare',
  extracted: 'Extras',
  needs_validation: 'Necesită validare',
  rejected: 'Respins',
  archived: 'Arhivat',
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Ciornă',
  needs_validation: 'Necesită validare',
  ready_to_import: 'Gata de import',
  importing: 'În import',
  imported: 'Importat',
  import_failed: 'Import eșuat',
  rejected: 'Respinsă',
}

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Pages through with .range() rather than a single unbounded select, so
 * completeness never depends on PostgREST's default row cap. */
async function fetchAllEmailsInRange(
  supabase: ReturnType<typeof serviceClient>,
  from: string,
  to: string,
): Promise<EmailForReport[]> {
  const results: EmailForReport[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('emails')
      .select(
        `received_at, sender, subject, status,
         orders (
           id, client_order_number, client_name, pickup_address, pickup_at,
           delivery_address, delivery_at, carrier_proposed, transport_amount,
           currency, confidence_overall, status, external_reference_id, imported_at
         )`,
      )
      .gte('received_at', from)
      .lte('received_at', to)
      .order('received_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)

    const page = (data ?? []) as unknown as EmailForReport[]
    results.push(...page)

    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return results
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  let payload: GenerateReportPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (!payload.from || !payload.to) {
    return jsonResponse({ error: 'from and to are required' }, 400)
  }

  const supabase = serviceClient()

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const emails = await fetchAllEmailsInRange(supabase, payload.from, payload.to)

    const statusFilter = payload.status
    const clientNameFilter = payload.client_name?.trim().toLowerCase()

    const rows: Record<string, unknown>[] = []
    for (const email of emails) {
      for (const order of email.orders ?? []) {
        if (statusFilter && statusFilter.length > 0 && !statusFilter.includes(order.status)) continue
        if (clientNameFilter && !(order.client_name ?? '').toLowerCase().includes(clientNameFilter)) continue

        rows.push({
          'Data primire email': email.received_at,
          Expeditor: email.sender,
          Subiect: email.subject ?? '',
          'Status email': EMAIL_STATUS_LABELS[email.status] ?? email.status,
          'Număr comandă client': order.client_order_number ?? '',
          Client: order.client_name ?? '',
          'Adresă ridicare': order.pickup_address ?? '',
          'Dată ridicare': order.pickup_at ?? '',
          'Adresă livrare': order.delivery_address ?? '',
          'Dată livrare': order.delivery_at ?? '',
          Transportator: order.carrier_proposed ?? '',
          'Sumă transport': order.transport_amount ?? '',
          Monedă: order.currency,
          'Încredere extracție': order.confidence_overall ?? '',
          'Status comandă': ORDER_STATUS_LABELS[order.status] ?? order.status,
          'ID AscendTMS': order.external_reference_id ?? '',
          'Dată import': order.imported_at ?? '',
        })
      }
    }

    const csv = Papa.unparse(rows)

    return new Response(csv, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="raport-${payload.from}-${payload.to}.csv"`,
      },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('generate-report error:', errorMessage)
    return jsonResponse({ error: errorMessage }, 500)
  }
})
