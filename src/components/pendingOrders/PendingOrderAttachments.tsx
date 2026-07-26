import { File as FileIcon, FileSpreadsheet, FileText } from 'lucide-react'
import { formatFileSize } from '../../lib/emails/format'
import { getFileTypeMeta } from '../../lib/emails/fileType'
import type { EmailAttachmentRow } from '../../lib/emails/types'

interface PendingOrderAttachmentsProps {
  attachments: EmailAttachmentRow[]
}

function FileTypeIcon({ mimeType, filename }: { mimeType: string; filename: string }) {
  const { kind } = getFileTypeMeta(mimeType, filename)
  if (kind === 'pdf') return <FileText aria-hidden="true" size={16} />
  if (kind === 'xlsx' || kind === 'csv') return <FileSpreadsheet aria-hidden="true" size={16} />
  return <FileIcon aria-hidden="true" size={16} />
}

export function PendingOrderAttachments({ attachments }: PendingOrderAttachmentsProps) {
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
