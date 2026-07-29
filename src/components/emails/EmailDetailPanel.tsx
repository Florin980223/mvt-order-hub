import DOMPurify from 'dompurify'
import { Calendar, Flag, MoreVertical, Reply, Star } from 'lucide-react'
import { formatDateTime } from '../../lib/emails/format'
import type { EmailRow } from '../../lib/emails/types'
import { usePrimaryMailboxAddress } from '../../lib/emails/useEmailsQuery'
import { useOrderCorrection } from '../../lib/orders/useOrderCorrection'
import { useTogglePriorityMutation } from '../../lib/orders/useTogglePriorityMutation'
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

export function EmailDetailPanel({ email, isFavorite, onToggleFavorite }: EmailDetailPanelProps) {
  const { data: mailboxAddress } = usePrimaryMailboxAddress()
  const order = email.orders[0] ?? null
  const correction = useOrderCorrection(order)
  const togglePriority = useTogglePriorityMutation(order)

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
            {order && (
              <button
                type="button"
                className={`emails-detail__icon-btn${order.is_priority ? ' emails-detail__icon-btn--priority' : ''}`}
                onClick={() => togglePriority.mutate()}
                disabled={togglePriority.isPending}
                aria-label={order.is_priority ? 'Elimină prioritatea' : 'Marchează ca prioritară'}
              >
                <Flag aria-hidden="true" size={16} fill={order.is_priority ? 'currentColor' : 'none'} />
              </button>
            )}
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
            <button type="button" className="emails-detail__icon-btn" aria-label="Răspunde">
              <Reply aria-hidden="true" size={16} />
            </button>
            <button type="button" className="emails-detail__icon-btn" aria-label="Mai multe opțiuni">
              <MoreVertical aria-hidden="true" size={16} />
            </button>
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
