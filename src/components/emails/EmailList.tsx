import { Star } from 'lucide-react'
import { formatDate, formatTime } from '../../lib/emails/format'
import type { EmailRow } from '../../lib/emails/types'
import { AttachmentBadge } from './AttachmentBadge'
import { StatusBadge } from './StatusBadge'

// Outlook app-icon glyph (folder+ring in front, envelope peeking behind) —
// sampled at native resolution against figura1-dashboard.png and
// figura2-emailuri-noi.png: both mockups show this exact two-tone icon on
// every row (identical between the two, only the surrounding square's size
// differs, in proportion to each page's own row height), not a generic
// lucide mail glyph. Recreated inline since there's no lucide equivalent
// and no brand-icon package in this project (only lucide-react is used for
// icons elsewhere) rather than embedding a scraped image asset.
function OutlookGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 6h9.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10V6z" fill="#3EA6F5" />
      <path d="M10 7l5 4 4.5-4" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="3" width="10" height="18" rx="1.5" fill="#0B65C4" />
      <ellipse cx="8" cy="12" rx="2.6" ry="3.6" fill="none" stroke="#ffffff" strokeWidth="1.6" />
    </svg>
  )
}

interface EmailListProps {
  emails: EmailRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  // Optional: only DashboardPage passes these today (favoriting is a local,
  // unpersisted UI affordance — see docs/mockups/figura1-dashboard.png).
  // EmailsPage's list renders unchanged without them.
  favoriteIds?: Set<string>
  onToggleFavorite?: (id: string) => void
  // 'all' (default) shows the star on every row, matching figura1-dashboard.png
  // (Dashboard). 'selected' shows it only on the currently-selected row,
  // matching figura2-emailuri-noi.png (EmailsPage).
  starVisibility?: 'all' | 'selected'
  // Dashboard only (figura1-dashboard.png shows both date and time on each
  // row) — off by default so EmailsPage/PendingOrdersPage stay unchanged
  // until their own mockups are re-checked in this same audit pass.
  showDate?: boolean
}

export function EmailList({
  emails,
  selectedId,
  onSelect,
  favoriteIds,
  onToggleFavorite,
  starVisibility = 'all',
  showDate = false,
}: EmailListProps) {
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
              {/* Small leading dot — sampled at native resolution against
                  figura1-dashboard.png: every row has one, blue on all rows
                  except the single "Importat" (already-imported) row, which
                  is muted gray instead. There's no read/unread field in the
                  data model this could track, so it's tied to the one
                  status distinction the mockup's own sample actually shows
                  a color change for (fully imported vs. still in-flight). */}
              <span
                className={`emails-list-item__dot${email.status === 'imported' ? ' emails-list-item__dot--muted' : ''}`}
                aria-hidden="true"
              />
              <span className="emails-list-item__source-icon" aria-hidden="true">
                <OutlookGlyph />
              </span>
              <div className="emails-list-item__content">
                <div className="emails-list-item__row">
                  <span className="emails-list-item__sender">{email.sender}</span>
                  <span className="emails-list-item__time">
                    {showDate && `${formatDate(email.received_at)} `}
                    {formatTime(email.received_at)}
                  </span>
                </div>
                <div className="emails-list-item__subject">{email.subject ?? '(fără subiect)'}</div>
                <div className="emails-list-item__meta">
                  {email.email_attachments.map((attachment) => (
                    <AttachmentBadge key={attachment.id} mimeType={attachment.mime_type} filename={attachment.filename} />
                  ))}
                  <StatusBadge status={email.status} />
                </div>
              </div>
              {onToggleFavorite && (starVisibility === 'all' || email.id === selectedId) && (
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
