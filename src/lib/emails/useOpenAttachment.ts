import { useMutation } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

interface GetAttachmentSignedUrlResult {
  url: string
}

export function useOpenAttachment() {
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { data, error } = await supabase.functions.invoke<GetAttachmentSignedUrlResult>(
        'get-attachment-signed-url',
        { body: { attachment_id: attachmentId } },
      )
      if (error) throw error
      if (!data?.url) throw new Error('no signed URL returned')
      return data
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank', 'noopener,noreferrer')
    },
  })
}
