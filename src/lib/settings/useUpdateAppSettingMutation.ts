import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

interface UpdateAppSettingResult<T> {
  value_json: T
  updated_at: string
}

/**
 * Generic write side, mirroring update-outbound-api-setting /
 * update-confidence-threshold-setting's Edge Function + audit-log pattern
 * (see supabase/functions/update-app-setting) but parameterized by key
 * instead of one Edge Function per setting.
 */
export function useUpdateAppSettingMutation<T>(key: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (value_json: T) => {
      const { data, error } = await supabase.functions.invoke<UpdateAppSettingResult<T>>('update-app-setting', {
        body: { key, value_json },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', key] })
    },
  })
}
