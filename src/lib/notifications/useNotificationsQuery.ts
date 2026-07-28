import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface NotificationRow {
  id: string
  type: string
  title: string
  read_at: string | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

// notifications_select_own already scopes rows to the caller — no
// .eq('user_id', ...) filter needed.
export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, read_at, entity_type, entity_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as NotificationRow[]
    },
  })
}
