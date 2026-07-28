import type { EmailRow } from './types'

export function matchesSearch(email: EmailRow, searchText: string): boolean {
  if (searchText.trim().length === 0) return true
  const needle = searchText.trim().toLowerCase()
  return email.sender.toLowerCase().includes(needle) || (email.subject ?? '').toLowerCase().includes(needle)
}
