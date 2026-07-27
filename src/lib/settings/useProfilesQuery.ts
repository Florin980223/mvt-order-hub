import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface ProfileRow {
  id: string
  full_name: string | null
  role: string
  active: boolean
  created_at: string
}

export function useProfilesQuery() {
  return useQuery({
    queryKey: ['settings', 'profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, active, created_at')
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as ProfileRow[]
    },
  })
}
