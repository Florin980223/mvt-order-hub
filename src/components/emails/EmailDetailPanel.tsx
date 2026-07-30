import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { Calendar, MoreVertical, Reply, Star } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatDateTime } from '../../lib/emails/format'
import type { EmailRow } from '../../lib/emails/types'
import { usePrimaryMailboxAddress } from '../../lib/emails/useEmailsQuery'
import { useOrderCorrection } from '../../lib/orders/useOrderCorrection'
import { PendingOrderAttachments } from '../pendingOrders/PendingOrderAttachments'
import { PendingOrderFields } from '../pendingOrders/PendingOrderFields'
import { PendingOrderTopBar } from '../pendingOrders/PendingOrderTopBar'
import { ActionBar } from './ActionBar'
import { StatusBadge } from './StatusBadge'

interface EmailDetailPanelProps {
  email: EmailRow
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

interface SendEmailReplyResult {
  status: string
}

// Mirrors DashboardDetailPanel's own EVENT_TYPE_LABELS (not exported from
// there, so duplicated locally here rather than reaching into a
// dashboard-owned component from EmailsPage) — same event_type values
// inserted by submit-order/send-client-confirmation
// (supabase/functions/submit-order/index.ts, send-client-confirmation/index.ts).
const EVENT_TYPE_LABELS: Record<string, string> = {
  order_submitted: 'Comandă importată',
  order_submission_failed: 'Import eșuat',
  confirmation_sent: 'Confirmare trimisă clientului',
}

export function EmailDetailPanel({ email, isFavorite, onToggleFavorite }: EmailDetailPanelProps) {
  const { data: mailboxAddress } = usePrimaryMailboxAddress()
  const order = email.orders[0] ?? null
  const correction = useOrderCorrection(order)
  const queryClient = useQueryClient()

  // "Mai multe opțiuni" kebab — same order-history panel as
  // DashboardDetailPanel's showHistory, adapted to this file's own
  // emails-detail__* class prefix instead of pending-orders-detail__*.
  const [historyOpen, setHistoryOpen] = useState(false)
  const sortedEvents = order
    ? [...order.order_events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  // Inline compose panel for "Răspunde" — same toggle-panel interaction
  // pattern as the kebab above, but with real form inputs.
  const [replyOpen, setReplyOpen] = useState(false)
  const [replySubject, setReplySubject] = useState('')
  const [replyBody, setReplyBody] = useState('')

  const replyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<SendEmailReplyResult>('send-email-reply', {
        body: { email_id: email.id, subject: replySubject, body: replyBody },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setReplyOpen(false)
      setReplySubject('')
      setReplyBody('')
      queryClient.invalidateQueries({ queryKey: ['emails', 'list'] })
    },
  })

  function toggleReply() {
    setReplyOpen((open) => {
      const next = !open
      if (next) {
        setReplySubject(`Re: ${email.subject ?? '(fără subiect)'}`)
        setReplyBody('')
        replyMutation.reset()
      }
      return next
    })
    setHistoryOpen(false)
  }

  function toggleHistory() {
    setHistoryOpen((open) => !open)
    setReplyOpen(false)
  }

  const sanitizedBody = email.body_html
    ? DOMPurify.sanitize(email.body_html, { FORBID_TAGS: ['style', 'script'] })
    : ''

  return (
    <div className="emails-detail">
      <div className="emails-detail__scroll">
        <div className="emails-detail__header">
          <h2 className="emails-detail__subject">{email.subject ?? '(fără subiect)'}</h2>
          <div className="emails-detail__header-actions">
            <StatusBadge status={email.status} />
            {/* No flag/priority icon here — confirmed at native resolution
                against figura2-emailuri-noi.png that this row is the status
                pill + Star + Reply + "..." only. The is_priority feature
                itself (data, mutation, this page's own Prioritare tab) stays
                intact; this was just its only UI toggle, which never
                matched either brief mockup's icon row. */}
            {onToggleFavorite && (
              <button
                type="button"
                className={`emails-detail__icon-btn${isFavorite ? ' emails-detail__icon-btn--active' : ''}`}
                onClick={onToggleFavorite}
                aria-label={isFavorite ? 'Elimină de la favorite' : 'Adaugă la favorite'}
              >
                <Star aria-hidden="true" size={16} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <div className="emails-detail__reply">
              <button
                type="button"
                className={`emails-detail__icon-btn${replyOpen ? ' emails-detail__icon-btn--active' : ''}`}
                onClick={toggleReply}
                aria-label="Răspunde"
                aria-expanded={replyOpen}
              >
                <Reply aria-hidden="true" size={16} />
              </button>
              {replyOpen && (
                <div className="emails-detail__reply-panel" role="dialog" aria-label="Răspunde la email">
                  <h4 className="emails-detail__reply-panel-title">Răspunde</h4>
                  <label className="emails-detail__reply-field">
                    Către
                    <input type="text" value={email.sender} readOnly disabled />
                  </label>
                  <label className="emails-detail__reply-field">
                    Subiect
                    <input
                      type="text"
                      value={replySubject}
                      onChange={(event) => setReplySubject(event.target.value)}
                    />
                  </label>
                  <label className="emails-detail__reply-field">
                    Mesaj
                    <textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      rows={5}
                      required
                    />
                  </label>
                  {replyMutation.isError && (
                    <p className="emails-action-bar__error" role="alert">
                      {replyMutation.error instanceof Error ? replyMutation.error.message : 'Trimiterea răspunsului a eșuat.'}
                    </p>
                  )}
                  <div className="emails-detail__reply-actions">
                    <button
                      type="button"
                      className="emails-detail__reply-cancel"
                      onClick={() => {
                        setReplyOpen(false)
                        setReplySubject('')
                        setReplyBody('')
                        replyMutation.reset()
                      }}
                    >
                      Anulează
                    </button>
                    <button
                      type="button"
                      className="emails-detail__reply-send"
                      disabled={replyBody.trim().length === 0 || replyMutation.isPending}
                      onClick={() => replyMutation.mutate()}
                    >
                      {replyMutation.isPending ? 'Se trimite...' : 'Trimite'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="emails-detail__more">
              <button
                type="button"
                className={`emails-detail__icon-btn${historyOpen ? ' emails-detail__icon-btn--active' : ''}`}
                onClick={toggleHistory}
                aria-label="Mai multe opțiuni"
                aria-expanded={historyOpen}
              >
                <MoreVertical aria-hidden="true" size={16} />
              </button>
              {historyOpen && (
                <div className="emails-detail__more-panel" role="status">
                  <h4 className="emails-detail__more-panel-title">Istoric eveniment comandă</h4>
                  {sortedEvents.length === 0 ? (
                    <p className="emails-detail__more-panel-empty">Niciun eveniment încă.</p>
                  ) : (
                    <ul className="emails-detail__more-panel-list">
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
          </div>
        </div>
        <div className="emails-detail__received">
          <Calendar aria-hidden="true" size={14} />
          {formatDateTime(email.received_at)}
        </div>

        <dl className="emails-detail__addresses">
          <div className="emails-detail__addresses-col">
            <dt>De la:</dt>
            <dd>{email.sender}</dd>
          </div>
          <div className="emails-detail__addresses-col">
            <dt>Către:</dt>
            <dd>{mailboxAddress ?? '—'}</dd>
          </div>
          <div className="emails-detail__addresses-col">
            <dt>Cc:</dt>
            <dd>—</dd>
          </div>
        </dl>

        {/* body_html comes from Microsoft Graph and is untrusted — sanitize before rendering, never on raw HTML. */}
        <div className="emails-detail__body" dangerouslySetInnerHTML={{ __html: sanitizedBody }} />

        <PendingOrderAttachments attachments={email.email_attachments} variant="inline" showProcessedBadge />

        {order ? (
          <>
            <PendingOrderTopBar order={order} showReadiness />
            <section className="emails-detail__fields">
              <PendingOrderFields order={order} correction={correction} variant="preview" />
            </section>
          </>
        ) : (
          <div className="emails-detail__not-processed">Comanda nu a fost încă extrasă.</div>
        )}
      </div>

      <ActionBar
        order={order}
        emailId={email.id}
        emailStatus={email.status}
        correction={correction}
        showRetryExtraction={false}
      />
    </div>
  )
}
