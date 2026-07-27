import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface OutboundApiSettingRow {
  value_json: { url: string }
  updated_at: string
}

export function useOutboundApiQuery() {
  return useQuery({
    queryKey: ['settings', 'outbound-api'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value_json, updated_at')
        .eq('key', 'outbound_api')
        .maybeSingle()

      if (error) throw error
      return data as OutboundApiSettingRow | null
    },
  })
}
