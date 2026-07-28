import { Star } from 'lucide-react'
import { formatTime } from '../../lib/emails/format'
import type { EmailRow } from '../../lib/emails/types'
import { AttachmentBadge } from './AttachmentBadge'
import { StatusBadge } from './StatusBadge'

interface EmailListProps {
  emails: EmailRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  // Optional: only DashboardPage passes these today (favoriting is a local,
  // unpersisted UI affordance — see docs/mockups/figura1-dashboard.png).
  // EmailsPage's list renders unchanged without them.
  favoriteIds?: Set<string>
  onToggleFavorite?: (id: string) => void
}

export function EmailList({ emails, selectedId, onSelect, favoriteIds, onToggleFavorite }: EmailListProps) {
  if (emails.length === 0) {
    return <div className="emails-list-empty">Niciun email găsit.</div>
  }

  return (
    <ul className="emails-list">
      {emails.map((email) => {
        const isFavorite = favoriteIds?.has(email.id) ?? false
        return (
          <li key={email.id}>
            <div
              role="button"
              tabIndex={0}
              className={`emails-list-item${email.id === selectedId ? ' emails-list-item--selected' : ''}`}
              onClick={() => onSelect(email.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(email.id)
              }}
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
              {onToggleFavorite && (
                <button
                  type="button"
                  className={`emails-list-item__favorite${isFavorite ? ' emails-list-item__favorite--active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleFavorite(email.id)
                  }}
                  aria-label={isFavorite ? 'Elimină de la favorite' : 'Adaugă la favorite'}
                >
                  <Star aria-hidden="true" size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
