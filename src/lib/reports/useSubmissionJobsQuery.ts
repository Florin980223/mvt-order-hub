import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface SubmissionJobRow {
  id: string
  status: string
  created_at: string
}

export function useSubmissionJobsQuery() {
  return useQuery({
    queryKey: ['reports', 'submission-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('submission_jobs').select('id, status, created_at')

      if (error) throw error
      return data as SubmissionJobRow[]
    },
  })
}
