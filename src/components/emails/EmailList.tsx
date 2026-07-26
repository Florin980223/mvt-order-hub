import { formatTime } from '../../lib/emails/format'
import type { EmailRow } from '../../lib/emails/types'
import { AttachmentBadge } from './AttachmentBadge'
import { StatusBadge } from './StatusBadge'

interface EmailListProps {
  emails: EmailRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  if (emails.length === 0) {
    return <div className="emails-list-empty">Niciun email găsit.</div>
  }

  return (
    <ul className="emails-list">
      {emails.map((email) => (
        <li key={email.id}>
          <button
            type="button"
            className={`emails-list-item${email.id === selectedId ? ' emails-list-item--selected' : ''}`}
            onClick={() => onSelect(email.id)}
          >
            <div className="emails-list-item__row">
              <span className="emails-list-item__sender">{email.sender}</span>
              <span className="emails-list-item__time">{formatTime(email.received_at)}</span>
            </div>
            <div className="emails-list-item__subject">{email.subject ?? '(fără subiect)'}</div>
            <div className="emails-list-item__meta">
              {email.email_attachments.map((attachment) => (
                <AttachmentBadge key={attachment.id} mimeType={attachment.mime_type} filename={attachment.filename} />
              ))}
              <StatusBadge status={email.status} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
