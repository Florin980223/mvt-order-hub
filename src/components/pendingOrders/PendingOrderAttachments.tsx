import { Check, Download, File as FileIcon, FileSpreadsheet, FileText } from 'lucide-react'
import { formatFileSize } from '../../lib/emails/format'
import { formatCurrency, formatNumber } from '../../lib/reports/format'
import { getFileTypeMeta, type FileKind } from '../../lib/emails/fileType'
import { useOpenAttachment } from '../../lib/emails/useOpenAttachment'
import type { EmailAttachmentRow, OrderRow } from '../../lib/emails/types'
import { AttachmentBadge } from '../emails/AttachmentBadge'

interface PendingOrderAttachmentsProps {
  attachments: EmailAttachmentRow[]
  // 'sidebar' (default) is PendingOrdersPage's stacked side-column list.
  // 'inline' is Dashboard's side-by-side card row (figura1-dashboard.png),
  // rendered inside PendingOrderTopBar in place of the "Istoric AI" button.
  variant?: 'sidebar' | 'inline'
  // 'inline' only: adds a green checkmark badge to each card, matching
  // figura2-emailuri-noi.png. Off by default so Dashboard's cards (which
  // figura1 doesn't show this on) stay unchanged.
  showProcessedBadge?: boolean
  // 'inline' only: figura4-comenzi-importate.png shows this card row
  // inside its own info-card summary, with no repeated "Atașamente (N)"
  // heading (the summary already has its own "Atașamente" label above the
  // row). On by default so Dashboard/EmailsPage stay unchanged.
  showHeading?: boolean
  // sidebar variant only: feeds the document-preview thumbnail with the
  // order's own extracted fields (client/route/cargo/price) instead of
  // generic placeholder bars — see AttachmentPreviewThumbnail below.
  // Optional so Dashboard/EmailsPage's 'inline' call sites (which don't
  // render the sidebar preview at all) don't need to pass it.
  order?: OrderRow
}

function FileTypeIcon({ mimeType, filename }: { mimeType: string; filename: string }) {
  const { kind } = getFileTypeMeta(mimeType, filename)
  if (kind === 'pdf') return <FileText aria-hidden="true" size={16} />
  if (kind === 'xlsx' || kind === 'csv') return <FileSpreadsheet aria-hidden="true" size={16} />
  return <FileIcon aria-hidden="true" size={16} />
}

function routeLabel(order?: OrderRow): string {
  const from = order?.pickup_address?.split(',')[0]?.trim()
  const to = order?.delivery_address?.split(',')[0]?.trim()
  if (from && to) return `${from} → ${to}`
  return from || to || '—'
}

function priceLabel(order?: OrderRow): string {
  if (order?.transport_amount == null) return '—'
  return formatCurrency(order.transport_amount, order.currency)
}

function cargoLabel(order?: OrderRow): string {
  if (!order?.cargo_type) return '—'
  if (order.quantity != null && order.quantity_unit) {
    return `${order.cargo_type} · ${formatNumber(order.quantity)} ${order.quantity_unit}`
  }
  return order.cargo_type
}

// Document-preview thumbnail (figura3-comenzi-asteptare.png, sidebar variant
// only). There's no client-side PDF-to-canvas renderer in this project (no
// pdfjs-dist in package.json; unpdf/pdf-lib are used server-side for
// extraction, not canvas rendering), so this isn't a pixel render of the
// actual PDF/XLSX page — but instead of generic gray placeholder bars, it
// renders the order's own already-extracted fields (client, route, cargo,
// price — the same data PendingOrderFields shows) laid out like the
// mockup's header+table card, so what's on screen is real per-order data,
// not invented sample content. The whole card is a real button: clicking it
// calls the same get-attachment-signed-url flow as the download icon, which
// opens the actual file (browsers render PDFs natively in the new tab —
// a genuine preview of the real attachment, not a mock of one).
function AttachmentPreviewThumbnail({
  kind,
  order,
  filename,
  onOpen,
  isOpening,
}: {
  kind: FileKind
  order?: OrderRow
  filename: string
  onOpen: () => void
  isOpening: boolean
}) {
  if (kind === 'pdf') {
    return (
      <button
        type="button"
        className="pending-orders-attachments__preview pending-orders-attachments__preview--pdf"
        onClick={onOpen}
        disabled={isOpening}
        title={`Previzualizează ${filename}`}
      >
        <span className="pending-orders-attachments__preview-title">{order?.client_name ?? 'Client necunoscut'}</span>
        <span className="pending-orders-attachments__preview-subtitle">COMANDĂ TRANSPORT</span>
        <div className="pending-orders-attachments__preview-table">
          <div className="pending-orders-attachments__preview-table-header">
            <span>Traseu</span>
            <span>Sumă</span>
          </div>
          <div className="pending-orders-attachments__preview-table-row">
            <span>{routeLabel(order)}</span>
            <span>{priceLabel(order)}</span>
          </div>
        </div>
      </button>
    )
  }

  if (kind === 'xlsx' || kind === 'csv') {
    return (
      <button
        type="button"
        className="pending-orders-attachments__preview pending-orders-attachments__preview--sheet"
        onClick={onOpen}
        disabled={isOpening}
        title={`Previzualizează ${filename}`}
      >
        <div className="pending-orders-attachments__preview-grid-row pending-orders-attachments__preview-grid-row--header">
          <span>Marfă</span>
          <span>Rută</span>
          <span>Preț</span>
        </div>
        <div className="pending-orders-attachments__preview-grid-row pending-orders-attachments__preview-grid-row--data">
          <span title={cargoLabel(order)}>{cargoLabel(order)}</span>
          <span title={routeLabel(order)}>{routeLabel(order)}</span>
          <span>{priceLabel(order)}</span>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="pending-orders-attachments__preview-grid-row pending-orders-attachments__preview-grid-row--filler">
            <span />
            <span />
            <span />
          </div>
        ))}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="pending-orders-attachments__preview pending-orders-attachments__preview--generic"
      onClick={onOpen}
      disabled={isOpening}
      title={`Deschide ${filename}`}
    >
      <FileIcon aria-hidden="true" size={28} />
    </button>
  )
}

export function PendingOrderAttachments({
  attachments,
  variant = 'sidebar',
  showProcessedBadge = false,
  showHeading = true,
  order,
}: PendingOrderAttachmentsProps) {
  const openAttachment = useOpenAttachment()

  if (variant === 'inline') {
    return (
      <div className="pending-orders-attachments--inline">
        {showHeading && (
          <h4 className="pending-orders-attachments--inline__heading">Atașamente ({attachments.length})</h4>
        )}
        {attachments.length > 0 && (
          <div className="pending-orders-attachments--inline__cards">
            {attachments.map((attachment) => {
              const { kind } = getFileTypeMeta(attachment.mime_type, attachment.filename)
              return (
                <div
                  key={attachment.id}
                  className={`pending-orders-attachments--inline__card${
                    showProcessedBadge ? ' pending-orders-attachments--inline__card--processed' : ''
                  }`}
                >
                  <span
                    className={`pending-orders-attachments--inline__icon pending-orders-attachments--inline__icon--${kind}`}
                  >
                    <FileTypeIcon mimeType={attachment.mime_type} filename={attachment.filename} />
                    {/* Overlay corner badge (solid fill, not the light-tint pill
                        AttachmentBadge renders elsewhere) — matches the
                        PDF/Excel corner tag on figura1-dashboard.png's
                        attachment cards. Recolored to solid+white via the
                        --type-badge wrapper below rather than changing
                        AttachmentBadge itself, which the file-type pills
                        elsewhere (email list rows, sidebar variant) still use
                        unchanged. Hidden when showProcessedBadge is set
                        (EmailsPage/figura2-emailuri-noi.png's own cards bake
                        the file type into the icon's solid fill color
                        instead — see --card--processed in PendingOrdersPage.css) —
                        this corner pill stays for Dashboard's own inline
                        cards (figura1-dashboard.png), unaffected. */}
                    <span className="pending-orders-attachments--inline__type-badge">
                      <AttachmentBadge mimeType={attachment.mime_type} filename={attachment.filename} />
                    </span>
                  </span>
                  <span className="pending-orders-attachments--inline__info">
                    <span className="pending-orders-attachments--inline__name">{attachment.filename}</span>
                    <span className="pending-orders-attachments--inline__size">{formatFileSize(attachment.size)}</span>
                  </span>
                  {showProcessedBadge && (
                    // Plain trailing checkmark, not a circle-badge overlaid on
                    // the icon — figura2-emailuri-noi.png's own cards show a
                    // bare check at the card's far right, not the overlaid
                    // circle badge figura1's cards never had a match for.
                    <Check
                      aria-hidden="true"
                      size={16}
                      className="pending-orders-attachments--inline__processed-check"
                    />
                  )}
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
              )
            })}
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
          {attachments.map((attachment) => {
            const { kind } = getFileTypeMeta(attachment.mime_type, attachment.filename)
            return (
              <li key={attachment.id} className="pending-orders-attachments__card">
                <div className="pending-orders-attachments__row">
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
                </div>
                <AttachmentPreviewThumbnail
                  kind={kind}
                  order={order}
                  filename={attachment.filename}
                  onOpen={() => openAttachment.mutate(attachment.id)}
                  isOpening={openAttachment.isPending && openAttachment.variables === attachment.id}
                />
              </li>
            )
          })}
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
