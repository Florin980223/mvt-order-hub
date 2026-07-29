/**
 * Hand-written to mirror the exact useEmailsQuery select() shape — the
 * Supabase client has no generated Database types yet (see
 * src/lib/supabaseClient.ts). Introducing `supabase gen types typescript`
 * project-wide is a reasonable future improvement, kept out of scope here.
 */

export interface OrderFieldSourceRow {
  field_name: string
  source_type: string
  source_ref: string | null
  confidence: number | null
  created_at: string
}

export interface OrderEventRow {
  id: string
  event_type: string
  payload: unknown
  created_at: string
}

export interface OrderRow {
  id: string
  client_order_number: string | null
  client_name: string | null
  pickup_address: string | null
  pickup_at: string | null
  delivery_address: string | null
  delivery_at: string | null
  cargo_type: string | null
  quantity: number | null
  quantity_unit: string | null
  weight_kg: number | null
  volume_m3: number | null
  transport_amount: number | null
  currency: string
  carrier_proposed: string | null
  notes: string | null
  confidence_overall: number | null
  status: string
  is_priority: boolean
  external_reference_id: string | null
  // Sent-orders (Phase 7e-1) only — null until an order is actually
  // imported. updated_by is the profiles.id of whoever ran the import;
  // resolving it to a display name is a separate query (useProfilesQuery),
  // not an embedded join, since RLS only lets admins see other profiles
  // (profiles_select_admin) — a non-admin operator legitimately can't
  // resolve someone else's name, and this must degrade gracefully rather
  // than assume the join always succeeds.
  imported_at: string | null
  updated_by: string | null
  order_field_sources: OrderFieldSourceRow[]
  order_events: OrderEventRow[]
}

export interface EmailAttachmentRow {
  id: string
  filename: string
  mime_type: string
  size: number
  storage_path: string
  created_at: string
}

export interface ExtractionJobRow {
  id: string
  status: string
  error: string | null
  created_at: string
  // Reports-only (Phase 7f-1 timing section) — both nullable, set once the
  // job actually starts/finishes running; null while still queued.
  started_at: string | null
  finished_at: string | null
}

export interface EmailRow {
  id: string
  graph_message_id: string
  sender: string
  subject: string | null
  body_html: string | null
  received_at: string
  status: string
  // Reports-only (Phase 7f-1 timing section) — distinct from received_at
  // (the Graph/mailbox timestamp): this is when our own ingest pipeline
  // inserted the row, i.e. when "Preluare email" actually finished.
  created_at: string
  email_attachments: EmailAttachmentRow[]
  orders: OrderRow[]
  extraction_jobs: ExtractionJobRow[]
}
