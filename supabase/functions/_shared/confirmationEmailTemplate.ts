// PLACEHOLDER — no official MVT client-confirmation template exists yet
// (brief lists this as something the client should provide). Short,
// professional, generic Romanian copy for MVP; swap this function's
// output when a real template is provided.

interface ConfirmationEmailOrder {
  client_order_number: string | null
  pickup_address: string | null
  pickup_at: string | null
  delivery_address: string | null
  delivery_at: string | null
  carrier_proposed: string | null
}

function formatDateTime(value: string | null): string {
  if (!value) return 'nespecificat'
  return new Date(value).toLocaleString('ro-RO')
}

export function buildConfirmationEmail(order: ConfirmationEmailOrder): { subject: string; body: string } {
  const orderNumber = order.client_order_number ?? 'nespecificat'

  const subject = `Confirmare comandă #${orderNumber} — MVT Order Hub`

  const body = `Bună,

Vă confirmăm că am primit și procesat comanda dumneavoastră de transport, cu următoarele detalii:

Număr comandă: ${orderNumber}
Ridicare: ${order.pickup_address ?? 'nespecificat'} (${formatDateTime(order.pickup_at)})
Livrare: ${order.delivery_address ?? 'nespecificat'} (${formatDateTime(order.delivery_at)})
Transportator: ${order.carrier_proposed ?? 'nespecificat'}

Comanda a fost înregistrată cu succes în sistemul nostru.

Cu stimă,
Echipa MVT`

  return { subject, body }
}
