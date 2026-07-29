import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface SubmissionJobRow {
  id: string
  order_id: string
  status: string
  created_at: string
  // Generic ON UPDATE trigger timestamp, not a dedicated "succeeded at"
  // marker — see aggregations.ts's import-duration calc for why
  // orders.imported_at is used instead of this for "Import în AscendTMS".
  updated_at: string
}

export function useSubmissionJobsQuery() {
  return useQuery({
    queryKey: ['reports', 'submission-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('submission_jobs').select('id, order_id, status, created_at, updated_at')

      if (error) throw error
      return data as SubmissionJobRow[]
    },
  })
}
