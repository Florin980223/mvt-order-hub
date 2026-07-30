import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileDown, History, Send } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatDateTime } from '../../lib/emails/format'
import type { OrderRow } from '../../lib/emails/types'

interface SentOrderActionBarProps {
  order: OrderRow
  // "Vezi istoric import" and the detail header's kebab ("Mai multe
  // opțiuni") both toggle the exact same history panel rendered below —
  // lifted to SentOrdersPage (this component's sole caller) rather than
  // kept as local state, so both triggers stay in sync instead of each
  // opening its own independent copy.
  showHistory: boolean
  onToggleHistory: () => void
}

interface SendClientConfirmationResult {
  status: string
}

// order.order_events is already embedded by useEmailsQuery, so "Vezi
// istoric import" needs no extra query — this is a real event log, not a
// stub, unlike Deschide în AscendTMS above (still a real stub; Exportă PDF
// below is no longer one — see buildOrderExportHtml/handleExport). Labels
// mirror the exact event_type values submit-order/send-client-confirmation
// insert (supabase/functions/submit-order/index.ts, send-client-confirmation/index.ts).
const EVENT_TYPE_LABELS: Record<string, string> = {
  order_submitted: 'Comandă importată',
  order_submission_failed: 'Import eșuat',
  confirmation_sent: 'Confirmare trimisă clientului',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function pdfRow(label: string, value: string): string {
  return `<tr><td class="label">${escapeHtml(label)}</td><td class="value">${escapeHtml(value)}</td></tr>`
}

function pdfSection(title: string, rows: string): string {
  return `<h2>${escapeHtml(title)}</h2><table>${rows}</table>`
}

/**
 * Builds a print-friendly standalone HTML document for "Exportă PDF" — no
 * pdf-lib/jsPDF dependency (pdf-lib is a devDependency only, used by
 * fixtures/generateAttachmentBytes.ts for seed data, not shipped to the
 * frontend bundle). Relies entirely on the browser's native print-to-PDF
 * (window.print() in a new tab, see handleExport below) instead.
 */
function buildOrderExportHtml(order: OrderRow): string {
  const orderNumber = order.client_order_number ?? order.id
  const quantity = order.quantity !== null ? `${order.quantity}${order.quantity_unit ? ` ${order.quantity_unit}` : ''}` : '—'
  const weight = order.weight_kg !== null ? `${order.weight_kg} kg` : '—'
  const volume = order.volume_m3 !== null ? `${order.volume_m3} m³` : '—'
  const transportAmount = order.transport_amount !== null ? `${order.transport_amount} ${order.currency}` : '—'

  const generalRows =
    pdfRow('Număr comandă client', order.client_order_number ?? '—') +
    pdfRow('Client / Expeditor', order.client_name ?? '—') +
    pdfRow('Număr comandă AscendTMS', order.external_reference_id ?? '—')

  const pickupRows =
    pdfRow('Adresă pickup', order.pickup_address ?? '—') +
    pdfRow('Dată & ora pickup', formatDateTime(order.pickup_at)) +
    pdfRow('Adresă delivery', order.delivery_address ?? '—') +
    pdfRow('Dată & ora delivery', formatDateTime(order.delivery_at))

  const cargoRows =
    pdfRow('Tip marfă', order.cargo_type ?? '—') +
    pdfRow('Cantitate', quantity) +
    pdfRow('Greutate', weight) +
    pdfRow('Volum', volume)

  const financialRows = pdfRow('Valoare transport', transportAmount) + pdfRow('Carrier atribuit', order.carrier_proposed ?? '—')

  const notesRows = order.notes ? pdfRow('Note', order.notes) : ''

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8" />
<title>Comandă ${escapeHtml(orderNumber)} — MVT Logistics</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2933; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { color: #6b6375; font-size: 13px; margin: 0 0 24px; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #d0d5dd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 4px 0; vertical-align: top; }
  td.label { width: 220px; color: #6b6375; }
  td.value { font-weight: 600; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>MVT Logistics</h1>
  <p class="subtitle">Comandă #${escapeHtml(orderNumber)} — generat la ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
  ${pdfSection('Date generale', generalRows)}
  ${pdfSection('Pickup / Delivery', pickupRows)}
  ${pdfSection('Marfă', cargoRows)}
  ${pdfSection('Transport', financialRows)}
  ${notesRows ? pdfSection('Note', notesRows) : ''}
</body>
</html>`
}

/**
 * figura4-comenzi-importate.png's own 4-button action bar — none of
 * ActionBar.tsx's buttons apply post-import, so this is a separate
 * component, not a variant. Reuses .emails-action-bar/__btn's existing
 * CSS (green/outline/amber/outline already covers this exact pattern).
 */
export function SentOrderActionBar({ order, showHistory, onToggleHistory }: SentOrderActionBarProps) {
  const queryClient = useQueryClient()
  const [exportError, setExportError] = useState<string | null>(null)

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

  function handleExport() {
    setExportError(null)
    try {
      const html = buildOrderExportHtml(order)
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        setExportError('Fereastra de export a fost blocată de browser — permite pop-up-uri pentru acest site.')
        return
      }
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()

      // document.write-based content doesn't always fire `onload` reliably
      // across browsers, so this pairs it with a short-delay fallback — a
      // `printed` guard keeps whichever fires first from triggering print()
      // twice (which would pop a second dialog).
      let printed = false
      const triggerPrint = () => {
        if (printed) return
        printed = true
        printWindow.focus()
        printWindow.print()
      }
      printWindow.onload = triggerPrint
      setTimeout(triggerPrint, 300)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Exportul PDF a eșuat.')
    }
  }

  return (
    <div className="emails-action-bar sent-order-action-bar">
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
        onClick={onToggleHistory}
        aria-expanded={showHistory}
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
      <button type="button" className="emails-action-bar__btn emails-action-bar__btn--outline" onClick={handleExport}>
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

      {exportError && (
        <p className="emails-action-bar__error" role="alert">
          {exportError}
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
