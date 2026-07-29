import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileDown, History, Send } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatDateTime } from '../../lib/emails/format'
import type { OrderRow } from '../../lib/emails/types'

interface SentOrderActionBarProps {
  order: OrderRow
}

interface SendClientConfirmationResult {
  status: string
}

// order.order_events is already embedded by useEmailsQuery, so "Vezi
// istoric import" needs no extra query — this is a real event log, not a
// stub, unlike Deschide în AscendTMS/Exportă PDF below. Labels mirror the
// exact event_type values submit-order/send-client-confirmation insert
// (supabase/functions/submit-order/index.ts, send-client-confirmation/index.ts).
const EVENT_TYPE_LABELS: Record<string, string> = {
  order_submitted: 'Comandă importată',
  order_submission_failed: 'Import eșuat',
  confirmation_sent: 'Confirmare trimisă clientului',
}

/**
 * figura4-comenzi-importate.png's own 4-button action bar — none of
 * ActionBar.tsx's buttons apply post-import, so this is a separate
 * component, not a variant. Reuses .emails-action-bar/__btn's existing
 * CSS (green/outline/amber/outline already covers this exact pattern).
 */
export function SentOrderActionBar({ order }: SentOrderActionBarProps) {
  const queryClient = useQueryClient()
  const [showHistory, setShowHistory] = useState(false)

  const sendConfirmationMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke<SendClientConfirmationResult>(
        'send-client-confirmation',
        { body: { order_id: orderId } },
      )
      if (error) throw error
      return data
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })

  const sortedEvents = [...order.order_events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="emails-action-bar">
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--primary"
        disabled
        title="Integrarea cu AscendTMS nu este încă disponibilă"
      >
        <ExternalLink aria-hidden="true" size={16} />
        Deschide în AscendTMS
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--outline"
        onClick={() => setShowHistory((current) => !current)}
      >
        <History aria-hidden="true" size={16} />
        Vezi istoric import
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--amber"
        disabled={sendConfirmationMutation.isPending}
        onClick={() => sendConfirmationMutation.mutate(order.id)}
      >
        <Send aria-hidden="true" size={16} />
        {sendConfirmationMutation.isPending ? 'Se trimite...' : 'Re-trimite confirmare'}
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--outline"
        disabled
        title="Exportul PDF nu este încă disponibil"
      >
        <FileDown aria-hidden="true" size={16} />
        Exportă PDF
      </button>

      {sendConfirmationMutation.isError && (
        <p className="emails-action-bar__error" role="alert">
          {sendConfirmationMutation.error instanceof Error
            ? sendConfirmationMutation.error.message
            : 'Trimiterea confirmării a eșuat.'}
        </p>
      )}

      {showHistory && (
        <div className="sent-order-action-bar__history" role="status">
          {sortedEvents.length === 0 ? (
            <p>Niciun eveniment înregistrat.</p>
          ) : (
            <ul>
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
  )
}
