import { Download, File as FileIcon, FileSpreadsheet, FileText } from 'lucide-react'
import { formatFileSize } from '../../lib/emails/format'
import { getFileTypeMeta } from '../../lib/emails/fileType'
import { useOpenAttachment } from '../../lib/emails/useOpenAttachment'
import type { EmailAttachmentRow } from '../../lib/emails/types'
import { AttachmentBadge } from '../emails/AttachmentBadge'

interface PendingOrderAttachmentsProps {
  attachments: EmailAttachmentRow[]
  // 'sidebar' (default) is PendingOrdersPage's stacked side-column list.
  // 'inline' is Dashboard's side-by-side card row (figura1-dashboard.png),
  // rendered inside PendingOrderTopBar in place of the "Istoric AI" button.
  variant?: 'sidebar' | 'inline'
}

function FileTypeIcon({ mimeType, filename }: { mimeType: string; filename: string }) {
  const { kind } = getFileTypeMeta(mimeType, filename)
  if (kind === 'pdf') return <FileText aria-hidden="true" size={16} />
  if (kind === 'xlsx' || kind === 'csv') return <FileSpreadsheet aria-hidden="true" size={16} />
  return <FileIcon aria-hidden="true" size={16} />
}

export function PendingOrderAttachments({ attachments, variant = 'sidebar' }: PendingOrderAttachmentsProps) {
  const openAttachment = useOpenAttachment()

  if (variant === 'inline') {
    return (
      <div className="pending-orders-attachments--inline">
        <h4 className="pending-orders-attachments--inline__heading">Atașamente ({attachments.length})</h4>
        {attachments.length > 0 && (
          <div className="pending-orders-attachments--inline__cards">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="pending-orders-attachments--inline__card">
                <span className="pending-orders-attachments--inline__icon">
                  <FileTypeIcon mimeType={attachment.mime_type} filename={attachment.filename} />
                </span>
                <span className="pending-orders-attachments--inline__info">
                  <span className="pending-orders-attachments--inline__name">{attachment.filename}</span>
                  <span className="pending-orders-attachments--inline__meta">
                    <AttachmentBadge mimeType={attachment.mime_type} filename={attachment.filename} />
                    {formatFileSize(attachment.size)}
                  </span>
                </span>
                <button
                  type="button"
                  className="pending-orders-attachments--inline__download"
                  onClick={() => openAttachment.mutate(attachment.id)}
                  disabled={openAttachment.isPending && openAttachment.variables === attachment.id}
                  title="Deschide"
                >
                  <Download aria-hidden="true" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {openAttachment.isError && (
          <p role="alert">
            {openAttachment.error instanceof Error ? openAttachment.error.message : 'Deschiderea atașamentului a eșuat.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="pending-orders-attachments">
      <h3>Atașamente detectate</h3>
      {attachments.length === 0 ? (
        <p className="pending-orders-attachments__empty">Niciun atașament.</p>
      ) : (
        <ul>
          {attachments.map((attachment) => (
            <li key={attachment.id} className="pending-orders-attachments__row">
              <FileTypeIcon mimeType={attachment.mime_type} filename={attachment.filename} />
              <span className="pending-orders-attachments__name">{attachment.filename}</span>
              <span className="pending-orders-attachments__size">{formatFileSize(attachment.size)}</span>
              <AttachmentBadge mimeType={attachment.mime_type} filename={attachment.filename} />
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
      )}
      {openAttachment.isError && (
        <p role="alert">
          {openAttachment.error instanceof Error ? openAttachment.error.message : 'Deschiderea atașamentului a eșuat.'}
        </p>
      )}
    </div>
  )
}
