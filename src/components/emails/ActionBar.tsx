import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { formatOrderStatus } from '../../lib/orders/format'
import { checkImportReadiness } from '../../lib/orders/importReadiness'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'
import type { OrderRow } from '../../lib/emails/types'

const DISABLED_TITLE = 'Disponibil din Faza 6'

// Mirrors submit-order's ELIGIBLE_STATUSES (supabase/functions/submit-order/index.ts)
// so the button reflects the same rule the server enforces.
const ELIGIBLE_STATUSES = ['needs_validation', 'ready_to_import', 'import_failed']

interface ActionBarProps {
  order: OrderRow | null
}

interface SubmitOrderResult {
  status: string
  external_id: string
}

/**
 * All 4 buttons are visually specified by the brief's mockup. Phase 6b
 * wires only the primary button — the other 3 stay disabled exactly as
 * before, their real behavior is a later phase.
 */
export function ActionBar({ order }: ActionBarProps) {
  const queryClient = useQueryClient()

  const submitMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke<SubmitOrderResult>('submit-order', {
        body: { order_id: orderId },
      })
      if (error) throw error
      return data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })

  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD

  const isEligible = order !== null && ELIGIBLE_STATUSES.includes(order.status)
  const readiness = order ? checkImportReadiness(order, confidenceThreshold) : null
  const isSubmitting = submitMutation.isPending
  const primaryDisabled = !isEligible || !readiness?.ready || isSubmitting

  const primaryTitle = !order
    ? 'Comanda nu a fost încă extrasă'
    : !isEligible
      ? `Comanda are statusul „${formatOrderStatus(order.status)}” — nu poate fi importată`
      : readiness && !readiness.ready
        ? [
            readiness.missingRequiredFields.length > 0 ? `Lipsesc: ${readiness.missingRequiredFields.join(', ')}` : null,
            readiness.lowConfidenceFields.length > 0
              ? `Sub pragul de încredere: ${readiness.lowConfidenceFields.join(', ')}`
              : null,
          ]
            .filter(Boolean)
            .join(' — ')
        : undefined

  return (
    <div className="emails-action-bar">
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--primary"
        disabled={primaryDisabled}
        title={primaryTitle}
        onClick={() => order && submitMutation.mutate(order.id)}
      >
        {isSubmitting ? 'Se importă...' : 'Salvează & Importă în AscendTMS'}
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--amber"
        disabled
        title={DISABLED_TITLE}
      >
        Corectează manual
      </button>
      <button type="button" className="emails-action-bar__btn emails-action-bar__btn--red" disabled title={DISABLED_TITLE}>
        Respinge email
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--blue"
        disabled
        title={DISABLED_TITLE}
      >
        Trimite confirmare client
      </button>
      {submitMutation.isError && (
        <p className="emails-action-bar__error" role="alert">
          {submitMutation.error instanceof Error ? submitMutation.error.message : 'Import eșuat.'}
        </p>
      )}
    </div>
  )
}
