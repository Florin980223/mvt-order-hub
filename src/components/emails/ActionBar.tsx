import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { formatOrderStatus } from '../../lib/orders/format'
import { checkImportReadiness } from '../../lib/orders/importReadiness'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'
import type { OrderCorrection } from '../../lib/orders/useOrderCorrection'
import type { OrderRow } from '../../lib/emails/types'

const DISABLED_TITLE = 'Disponibil din Faza 6'
const CORRECTION_UNAVAILABLE_TITLE = 'Disponibil din Comenzi în așteptare'

// Mirrors submit-order's ELIGIBLE_STATUSES (supabase/functions/submit-order/index.ts)
// so the button reflects the same rule the server enforces.
const ELIGIBLE_STATUSES = ['needs_validation', 'ready_to_import', 'import_failed']

// Mirrors correct-order-fields' / reject-email's CORRECTABLE_STATUSES /
// CASCADE_REJECT_STATUSES so both buttons reflect the same rule the
// server enforces.
const PRE_IMPORT_STATUSES = ['draft', 'needs_validation', 'ready_to_import', 'import_failed']

interface ActionBarProps {
  order: OrderRow | null
  emailId: string | null
  emailStatus?: string
  latestExtractionJobStatus?: string | null
  correction?: OrderCorrection
}

interface SubmitOrderResult {
  status: string
  external_id: string
}

interface RejectEmailResult {
  status: string
  cascaded_order_ids: string[]
}

interface RetryExtractionResult {
  status: string
}

/** All 4 buttons are visually specified by the brief's mockup. "Trimite confirmare client" stays disabled — a later phase. */
export function ActionBar({ order, emailId, emailStatus, latestExtractionJobStatus, correction }: ActionBarProps) {
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

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke<RejectEmailResult>('reject-email', {
        body: { email_id: id },
      })
      if (error) throw error
      return data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })

  const retryExtractionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke<RetryExtractionResult>('retry-extraction', {
        body: { email_id: id },
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

  const isEditing = correction?.isEditing ?? false
  const isEligible = order !== null && ELIGIBLE_STATUSES.includes(order.status)
  const readiness = order ? checkImportReadiness(order, confidenceThreshold) : null
  const isSubmitting = submitMutation.isPending
  const primaryDisabled = !isEligible || !readiness?.ready || isSubmitting || isEditing

  const primaryTitle = !order
    ? 'Comanda nu a fost încă extrasă'
    : isEditing
      ? 'Salvați sau anulați corectarea înainte de import'
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

  const canCorrect = order !== null && PRE_IMPORT_STATUSES.includes(order.status)
  const correctionDisabled = !correction || !canCorrect || correction.saveMutation.isPending
  const correctionTitle = !correction
    ? CORRECTION_UNAVAILABLE_TITLE
    : !canCorrect
      ? `Comanda are statusul „${formatOrderStatus(order!.status)}” — nu poate fi corectată`
      : undefined

  const canReject = emailId !== null && emailStatus !== 'rejected'
  const rejectDisabled = !canReject || rejectMutation.isPending || isEditing
  const rejectTitle = !emailId
    ? 'Emailul nu a fost încă identificat'
    : emailStatus === 'rejected'
      ? 'Emailul este deja respins'
      : undefined

  const canRetryExtraction = emailId !== null && latestExtractionJobStatus === 'failed'
  const retryExtractionDisabled = !canRetryExtraction || retryExtractionMutation.isPending || isEditing
  const retryExtractionTitle = !emailId
    ? 'Emailul nu a fost încă identificat'
    : latestExtractionJobStatus !== 'failed'
      ? 'Disponibil doar când ultima extragere a eșuat'
      : undefined

  function handleRejectClick() {
    if (!emailId) return
    if (!window.confirm('Sigur respingeți acest email? Comenzile asociate, dacă nu au fost deja importate, vor fi respinse și ele.')) {
      return
    }
    rejectMutation.mutate(emailId)
  }

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
        disabled={correctionDisabled}
        title={correctionTitle}
        onClick={() => {
          if (!correction) return
          if (isEditing) {
            correction.saveMutation.mutate()
          } else {
            correction.startEditing()
          }
        }}
      >
        {isEditing
          ? correction?.saveMutation.isPending
            ? 'Se salvează...'
            : 'Salvează corectările'
          : 'Corectează manual'}
      </button>
      {isEditing && (
        <button type="button" className="emails-action-bar__btn" onClick={() => correction?.cancelEditing()}>
          Anulează
        </button>
      )}
      <button
        type="button"
        className="emails-action-bar__btn"
        disabled={retryExtractionDisabled}
        title={retryExtractionTitle}
        onClick={() => emailId && retryExtractionMutation.mutate(emailId)}
      >
        {retryExtractionMutation.isPending ? 'Se reîncearcă...' : 'Reîncearcă extragerea'}
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--red"
        disabled={rejectDisabled}
        title={rejectTitle}
        onClick={handleRejectClick}
      >
        {rejectMutation.isPending ? 'Se respinge...' : 'Respinge email'}
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
      {correction?.saveMutation.isError && (
        <p className="emails-action-bar__error" role="alert">
          {correction.saveMutation.error instanceof Error
            ? correction.saveMutation.error.message
            : 'Salvarea corectărilor a eșuat.'}
        </p>
      )}
      {rejectMutation.isError && (
        <p className="emails-action-bar__error" role="alert">
          {rejectMutation.error instanceof Error ? rejectMutation.error.message : 'Respingerea a eșuat.'}
        </p>
      )}
      {retryExtractionMutation.isError && (
        <p className="emails-action-bar__error" role="alert">
          {retryExtractionMutation.error instanceof Error
            ? retryExtractionMutation.error.message
            : 'Reîncercarea extragerii a eșuat.'}
        </p>
      )}
    </div>
  )
}
