import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

export interface ExtractionJobLogRow {
  id: string
  email_id: string
  mode: string
  status: string
  attempts: number
  error: string | null
  has_error: boolean
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface EmailIngestQueueLogRow {
  id: string
  connection_id: string
  graph_message_id: string
  resource: string | null
  status: string
  attempts: number
  last_error: string | null
  has_error: boolean
  created_at: string
  updated_at: string
}

export interface SubmissionJobLogRow {
  id: string
  order_id: string
  mode: string | null
  status: string
  external_id: string | null
  error: string | null
  has_error: boolean
  created_at: string
  updated_at: string
}

export function useExtractionJobsLogQuery() {
  return useQuery({
    queryKey: ['logs', 'extraction-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extraction_jobs_log')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ExtractionJobLogRow[]
    },
  })
}

export function useEmailIngestQueueLogQuery() {
  return useQuery({
    queryKey: ['logs', 'email-ingest-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_ingest_queue_log')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EmailIngestQueueLogRow[]
    },
  })
}

export function useSubmissionJobsLogQuery() {
  return useQuery({
    queryKey: ['logs', 'submission-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submission_jobs_log')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as SubmissionJobLogRow[]
    },
  })
}
