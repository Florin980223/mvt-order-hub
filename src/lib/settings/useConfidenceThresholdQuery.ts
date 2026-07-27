import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.85

export interface ConfidenceThresholdSettingRow {
  value_json: { threshold: number }
  updated_at: string
}

export function useConfidenceThresholdQuery() {
  return useQuery({
    queryKey: ['settings', 'confidence-threshold'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value_json, updated_at')
        .eq('key', 'confidence_threshold')
        .maybeSingle()

      if (error) throw error
      return data as ConfidenceThresholdSettingRow | null
    },
  })
}
