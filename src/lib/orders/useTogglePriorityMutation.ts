import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import type { OrderRow } from '../emails/types'

interface TogglePriorityResult {
  status: string
  is_priority: boolean
}

/**
 * Persisted, shared-across-users flag — deliberately separate from the
 * favorite star (local/unpersisted UI state). Writes go through
 * toggle-order-priority since orders has no client-side UPDATE RLS policy
 * (every orders write goes through a service-role Edge Function).
 */
export function useTogglePriorityMutation(order: OrderRow | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('no order selected')

      const { data, error } = await supabase.functions.invoke<TogglePriorityResult>('toggle-order-priority', {
        body: { order_id: order.id, is_priority: !order.is_priority },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })
}
