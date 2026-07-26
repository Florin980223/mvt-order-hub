import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface MailConnectionRow {
  id: string
  mailbox_address: string
  status: string
  last_sync_at: string | null
}

/**
 * docs/DECISIONS.md notes individual-vs-shared mailbox connection is still
 * an open product decision — until then, the most recently created row
 * stands in as "the" connection for display purposes.
 */
export function useMailConnectionQuery() {
  return useQuery({
    queryKey: ['settings', 'mail-connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mail_connections')
        .select('id, mailbox_address, status, last_sync_at')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error
      return (data?.[0] as MailConnectionRow | undefined) ?? null
    },
  })
}
