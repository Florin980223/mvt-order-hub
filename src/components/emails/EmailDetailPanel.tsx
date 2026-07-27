import DOMPurify from 'dompurify'
import { Check, Download, File as FileIcon, FileSpreadsheet, FileText } from 'lucide-react'
import { formatDateTime, formatFileSize } from '../../lib/emails/format'
import type { EmailRow } from '../../lib/emails/types'
import { usePrimaryMailboxAddress } from '../../lib/emails/useEmailsQuery'
import { getFileTypeMeta } from '../../lib/emails/fileType'
import { useOpenAttachment } from '../../lib/emails/useOpenAttachment'
import { ActionBar } from './ActionBar'
import { ConfidenceBadge } from './ConfidenceBadge'
import { OrderFieldsSummary } from './OrderFieldsSummary'
import { StatusBadge } from './StatusBadge'

interface EmailDetailPanelProps {
  email: EmailRow
}

function FileTypeIcon({ mimeType, filename }: { mimeType: string; filename: string }) {
  const { kind } = getFileTypeMeta(mimeType, filename)
  if (kind === 'pdf') return <FileText aria-hidden="true" size={16} />
  if (kind === 'xlsx' || kind === 'csv') return <FileSpreadsheet aria-hidden="true" size={16} />
  return <FileIcon aria-hidden="true" size={16} />
}

export function EmailDetailPanel({ email }: EmailDetailPanelProps) {
  const { data: mailboxAddress } = usePrimaryMailboxAddress()
  const openAttachment = useOpenAttachment()
  const order = email.orders[0] ?? null

  const sanitizedBody = email.body_html
    ? DOMPurify.sanitize(email.body_html, { FORBID_TAGS: ['style', 'script'] })
    : ''

  return (
    <div className="emails-detail">
      <div className="emails-detail__scroll">
        <div className="emails-detail__header">
          <h2 className="emails-detail__subject">{email.subject ?? '(fără subiect)'}</h2>
          <StatusBadge status={email.status} />
        </div>
        <div className="emails-detail__received">{formatDateTime(email.received_at)}</div>

        <dl className="emails-detail__addresses">
          <div>
            <dt>De la</dt>
            <dd>{email.sender}</dd>
          </div>
          <div>
            <dt>Către</dt>
            <dd>{mailboxAddress ?? '—'}</dd>
          </div>
          <div>
            <dt>Cc</dt>
            <dd>—</dd>
          </div>
        </dl>

        {/* body_html comes from Microsoft Graph and is untrusted — sanitize before rendering, never on raw HTML. */}
        <div className="emails-detail__body" dangerouslySetInnerHTML={{ __html: sanitizedBody }} />

        {email.email_attachments.length > 0 && (
          <section className="emails-detail__attachments">
            <h3>Atașamente</h3>
            <ul>
              {email.email_attachments.map((attachment) => (
                <li key={attachment.id} className="emails-attachment-row">
                  <FileTypeIcon mimeType={attachment.mime_type} filename={attachment.filename} />
                  <span className="emails-attachment-row__name">{attachment.filename}</span>
                  <span className="emails-attachment-row__size">{formatFileSize(attachment.size)}</span>
                  <Check aria-hidden="true" size={16} className="emails-attachment-row__check" />
                  <button
                    type="button"
                    onClick={() => openAttachment.mutate(attachment.id)}
                    disabled={openAttachment.isPending && openAttachment.variables === attachment.id}
                    title="Deschide"
                  >
                    <Download aria-hidden="true" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            {openAttachment.isError && (
              <p role="alert">
                {openAttachment.error instanceof Error ? openAttachment.error.message : 'Deschiderea atașamentului a eșuat.'}
              </p>
            )}
          </section>
        )}

        {order ? (
          <>
            <section className="emails-detail__confidence">
              <ConfidenceBadge confidence={order.confidence_overall} />
              <span>Scor de încredere</span>
            </section>
            <section className="emails-detail__fields">
              <OrderFieldsSummary order={order} />
            </section>
          </>
        ) : (
          <div className="emails-detail__not-processed">Comanda nu a fost încă extrasă.</div>
        )}
      </div>

      <ActionBar order={order} />
    </div>
  )
}
