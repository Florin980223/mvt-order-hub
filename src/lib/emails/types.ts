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
  external_reference_id: string | null
  order_field_sources: OrderFieldSourceRow[]
}

export interface EmailAttachmentRow {
  id: string
  filename: string
  mime_type: string
  size: number
  storage_path: string
  created_at: string
}

export interface EmailRow {
  id: string
  graph_message_id: string
  sender: string
  subject: string | null
  body_html: string | null
  received_at: string
  status: string
  email_attachments: EmailAttachmentRow[]
  orders: OrderRow[]
}
