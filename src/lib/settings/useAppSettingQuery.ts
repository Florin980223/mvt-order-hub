import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface AppSettingRow<T> {
  value_json: T
  updated_at: string
}

/**
 * Generic read side of the app_settings key/value store — same table and
 * shape as useOutboundApiQuery/useConfidenceThresholdQuery, parameterized
 * by key so the ~5 new settings groups (general_preferences,
 * ai_extraction_preferences, notification_preferences,
 * ascend_import_settings, ascend_field_mapping) don't each need a
 * hand-written duplicate of this same query.
 */
export function useAppSettingQuery<T>(key: string) {
  return useQuery({
    queryKey: ['settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value_json, updated_at')
        .eq('key', key)
        .maybeSingle()

      if (error) throw error
      return data as AppSettingRow<T> | null
    },
  })
}
