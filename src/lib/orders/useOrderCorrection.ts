import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { ORDER_FIELD_SECTIONS } from './orderFields.ts'
import type { OrderRow } from '../emails/types'

function correctableFieldsOf(order: OrderRow): Record<string, string> {
  const values: Record<string, string> = {}
  for (const section of ORDER_FIELD_SECTIONS) {
    for (const field of section.fields) {
      if (field.rawValue) values[field.fieldName] = field.rawValue(order)
    }
  }
  return values
}

interface CorrectOrderFieldsResult {
  status: string
  fields: string[]
}

/**
 * Single edit-mode toggle for the whole PendingOrderFields panel (not
 * per-field inline editing) — owns draft values while editing and the
 * save mutation, shared by ActionBar (drives the toggle) and
 * PendingOrderFields (renders the inputs) so the state-lifting logic
 * isn't duplicated across the 3 pages that render both.
 */
export function useOrderCorrection(order: OrderRow | null) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})

  // A different order got selected mid-edit — don't leak stale edits onto it.
  const orderId = order?.id ?? null
  useEffect(() => {
    setIsEditing(false)
    setDraftValues({})
    // Only reset when the selected order actually changes, not on every
    // render — orderId is a stable primitive (string | null), safe as the
    // sole dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  function startEditing() {
    if (!order) return
    setDraftValues(correctableFieldsOf(order))
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setDraftValues({})
  }

  function updateDraftField(fieldName: string, value: string) {
    setDraftValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('no order selected')

      const current = correctableFieldsOf(order)
      const corrections: Record<string, string> = {}
      for (const [fieldName, draftValue] of Object.entries(draftValues)) {
        if (draftValue !== (current[fieldName] ?? '')) {
          corrections[fieldName] = draftValue
        }
      }
      if (Object.keys(corrections).length === 0) {
        return null
      }

      const { data, error } = await supabase.functions.invoke<CorrectOrderFieldsResult>('correct-order-fields', {
        body: { order_id: order.id, corrections },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setIsEditing(false)
      setDraftValues({})
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })

  return { isEditing, draftValues, startEditing, cancelEditing, updateDraftField, saveMutation }
}

export type OrderCorrection = ReturnType<typeof useOrderCorrection>
