import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import type { EmailRow } from './types'

/**
 * One combined query for both the list and detail panel — the dataset is
 * small (Phase 5a seeded 6 rows) and selection is pure client state, so
 * there's no need for a second network round-trip per row click.
 */
export function useEmailsQuery() {
  return useQuery({
    queryKey: ['emails', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select(
          `
          id, graph_message_id, sender, subject, body_html, received_at, status,
          email_attachments (id, filename, mime_type, size, storage_path, created_at),
          orders (
            id, client_order_number, client_name, pickup_address, pickup_at,
            delivery_address, delivery_at, cargo_type, quantity, quantity_unit,
            weight_kg, volume_m3, transport_amount, currency, carrier_proposed,
            notes, confidence_overall, status,
            order_field_sources (field_name, source_type, source_ref, confidence, created_at)
          )
        `,
        )
        .order('received_at', { ascending: false })

      if (error) throw error
      return data as unknown as EmailRow[]
    },
  })
}

/**
 * mail_connections is admin-only via RLS — this reads the mailbox address
 * through get_primary_mailbox_address(), a security-definer function that
 * exposes just that one column to any active profile (see migration
 * 20260729090000).
 */
export function usePrimaryMailboxAddress() {
  return useQuery({
    queryKey: ['emails', 'primary-mailbox-address'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_primary_mailbox_address')
      if (error) throw error
      return data as string | null
    },
    staleTime: 5 * 60 * 1000,
  })
}
