import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, History, Sparkles, TriangleAlert } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { ConfidenceBadge } from '../emails/ConfidenceBadge'
import type { EmailAttachmentRow, OrderRow } from '../../lib/emails/types'
import { countLowConfidenceFields } from '../../lib/orders/orderFields'
import { checkImportReadiness } from '../../lib/orders/importReadiness'
import { formatOrderStatus } from '../../lib/orders/format'
import { formatDateTime } from '../../lib/emails/format'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'
import { PendingOrderAttachments } from './PendingOrderAttachments'

// Mirrors DashboardDetailPanel's/EmailDetailPanel's own EVENT_TYPE_LABELS
// (not exported from either, so duplicated locally here rather than
// reaching into a dashboard/emails-owned component from this shared
// component) — same event_type values inserted by submit-order/
// send-client-confirmation (supabase/functions/submit-order/index.ts,
// send-client-confirmation/index.ts).
const EVENT_TYPE_LABELS: Record<string, string> = {
  order_submitted: 'Comandă importată',
  order_submission_failed: 'Import eșuat',
  confirmation_sent: 'Confirmare trimisă clientului',
}

// Mirrors ActionBar's/correct-order-fields' PRE_IMPORT_STATUSES — AI
// re-extraction only makes sense while an order hasn't left the review
// stage yet, same rule extract-order-ai enforces server-side.
const PRE_IMPORT_STATUSES = ['draft', 'needs_validation', 'ready_to_import', 'import_failed']

interface AiExtractOrderResult {
  status: string
  fields_updated: string[]
}

interface PendingOrderTopBarProps {
  order: OrderRow
  // When passed (Dashboard only), attachments render inline here, in the
  // "Istoric AI" button's slot, matching figura1-dashboard.png. Omitted
  // elsewhere (PendingOrdersPage) preserves today's layout exactly.
  attachments?: EmailAttachmentRow[]
  // EmailsPage only (figura2-emailuri-noi.png): when true and `attachments`
  // isn't passed (EmailsPage renders its own attachments section above this
  // component instead), the trailing slot shows a readiness pill instead of
  // the "Istoric AI" button.
  showReadiness?: boolean
  // PendingOrdersPage only (figura3-comenzi-asteptare.png): swaps the ring
  // gauge + heading/detail text for a simple checkmark+percentage pill, and
  // the warning pill gains an icon + "necesită validare" wording. Dashboard/
  // EmailsPage/SentOrdersPage keep the ring — their own mockups show it.
  compactConfidence?: boolean
}

export function PendingOrderTopBar({ order, attachments, showReadiness, compactConfidence }: PendingOrderTopBarProps) {
  const queryClient = useQueryClient()
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  const lowConfidenceCount = countLowConfidenceFields(order, confidenceThreshold)
  const overallPercent = order.confidence_overall != null ? Math.round(order.confidence_overall * 100) : null
  const readiness = checkImportReadiness(order, confidenceThreshold)

  // "Istoric AI" — same order-history toggle-panel pattern as
  // DashboardDetailPanel's/EmailDetailPanel's own kebab-triggered history
  // (order.order_events is already embedded by useEmailsQuery, same shape
  // both of those rely on), adapted to this shared component's own
  // pending-orders-topbar__* class prefix instead of pending-orders-detail__*
  // /emails-detail__*.
  const [historyOpen, setHistoryOpen] = useState(false)
  const sortedEvents = [...order.order_events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  // Same mutation shape as ActionBar's submitMutation/rejectMutation/etc.:
  // supabase.functions.invoke, invalidate the shared ['emails', 'list']
  // query on settle so confidence/fields refresh everywhere this order is
  // rendered, and a text-only pending state (no spinner icon) matching
  // ActionBar's own buttons.
  const aiExtractMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke<AiExtractOrderResult>('extract-order-ai', {
        body: { order_id: orderId },
      })
      if (error) throw error
      return data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })

  const canAiExtract = PRE_IMPORT_STATUSES.includes(order.status)
  const aiExtractDisabled = !canAiExtract || aiExtractMutation.isPending
  const aiExtractTitle = !canAiExtract
    ? `Comanda are statusul „${formatOrderStatus(order.status)}” — nu mai poate fi re-extrasă`
    : undefined

  return (
    <div className="pending-orders-topbar">
      <button
        type="button"
        className="pending-orders-topbar__btn pending-orders-topbar__btn--primary"
        disabled={aiExtractDisabled}
        title={aiExtractTitle}
        onClick={() => aiExtractMutation.mutate(order.id)}
      >
        <Sparkles aria-hidden="true" size={16} />
        {aiExtractMutation.isPending ? 'Se extrage...' : 'Extrage Automat cu AI'}
      </button>

      {aiExtractMutation.isError && (
        <p className="pending-orders-topbar__error" role="alert">
          {aiExtractMutation.error instanceof Error ? aiExtractMutation.error.message : 'Extragerea AI a eșuat.'}
        </p>
      )}

      {compactConfidence ? (
        <span className="pending-orders-topbar__confidence-pill">
          <CheckCircle2 aria-hidden="true" size={14} />
          {overallPercent != null ? `${overallPercent}% match` : '—'}
        </span>
      ) : (
        <div className="pending-orders-topbar__confidence">
          <ConfidenceBadge confidence={order.confidence_overall} />
          <div className="confidence-label">
            <span className="confidence-label__heading">Încredere extragere</span>
            <span className="confidence-label__detail">
              {overallPercent != null ? `${overallPercent}% date recunoscute` : '—'}
            </span>
          </div>
        </div>
      )}

      {lowConfidenceCount > 0 &&
        (compactConfidence ? (
          <span className="pending-orders-topbar__warning pending-orders-topbar__warning--compact">
            <TriangleAlert aria-hidden="true" size={14} />
            {lowConfidenceCount} câmpuri necesită validare
          </span>
        ) : (
          <span className="pending-orders-topbar__warning">{lowConfidenceCount} câmpuri sub prag de încredere</span>
        ))}

      {/* Pushed to the row's far right in all three mockups that use this
          trailing slot (figura1/figura2/figura3) — was left-packed right
          after the warning pill before. */}
      <div className="pending-orders-topbar__trailing">
        {attachments ? (
          <PendingOrderAttachments attachments={attachments} variant="inline" />
        ) : showReadiness ? (
          readiness.ready && (
            <span className="pending-orders-topbar__readiness">
              <CheckCircle2 aria-hidden="true" size={14} />
              Date pregătite pentru validare
            </span>
          )
        ) : (
          <div className="pending-orders-topbar__history">
            <button
              type="button"
              className="pending-orders-topbar__btn"
              onClick={() => setHistoryOpen((current) => !current)}
              aria-expanded={historyOpen}
            >
              <History aria-hidden="true" size={16} />
              Istoric AI
            </button>
            {historyOpen && (
              <div className="pending-orders-topbar__history-panel" role="status">
                <h4 className="pending-orders-topbar__history-panel-title">Istoric eveniment comandă</h4>
                {sortedEvents.length === 0 ? (
                  <p className="pending-orders-topbar__history-panel-empty">Niciun eveniment încă.</p>
                ) : (
                  <ul className="pending-orders-topbar__history-panel-list">
                    {sortedEvents.map((event) => (
                      <li key={event.id}>
                        <span>{EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}</span>
                        <span>{formatDateTime(event.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
