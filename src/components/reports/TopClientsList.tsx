import type { ClientOrderCount } from '../../lib/reports/aggregations'

interface TopClientsListProps {
  clients: ClientOrderCount[]
}

export function TopClientsList({ clients }: TopClientsListProps) {
  const maxCount = Math.max(1, ...clients.map((client) => client.count))

  if (clients.length === 0) {
    return <p className="reports-top-clients__empty">Niciun client în perioada selectată.</p>
  }

  return (
    <ol className="reports-top-clients">
      {clients.map((client, index) => (
        <li key={client.clientName} className="reports-top-clients__row">
          <span className="reports-top-clients__rank">{index + 1}</span>
          <span className="reports-top-clients__body">
            <span className="reports-top-clients__name">{client.clientName}</span>
            <span className="reports-top-clients__bar-track">
              <span
                className="reports-top-clients__bar-fill"
                style={{ width: `${(client.count / maxCount) * 100}%` }}
              />
            </span>
          </span>
          <span className="reports-top-clients__count">{client.count}</span>
        </li>
      ))}
    </ol>
  )
}
