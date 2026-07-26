const CONNECTION_STATUS_LABELS: Record<string, string> = {
  disconnected: 'Neconectat',
  connecting: 'Se conectează...',
  connected: 'Conectat',
  expiring_soon: 'Expiră în curând',
  error: 'Eroare',
}

export function formatConnectionStatus(status: string): string {
  return CONNECTION_STATUS_LABELS[status] ?? status
}
