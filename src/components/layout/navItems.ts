import { BarChart3, Clock, Home, Inbox, Mail, ScrollText, Settings, type LucideIcon } from 'lucide-react'

export type BadgeKey = 'needsValidationEmails' | 'pendingOrders' | 'importedOrders'

export interface NavItem {
  to: string
  label: string
  // Header page title, when it differs from the sidebar link text (e.g.
  // Dashboard's header reads "Centralizator Comenzi" while its sidebar
  // link stays "Dashboard") — falls back to `label` when unset.
  headerTitle?: string
  icon: LucideIcon
  badgeKey?: BadgeKey
  adminOnly?: boolean
}

// Single source of truth for the sidebar nav list and the header's
// route-derived page title (docs/mockups/figura1-dashboard.png).
// /technical-logs isn't part of the mockup's 6-item spec (brief 10.1) —
// it's a later addition (Phase 7a-10), kept in its existing position.
export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', headerTitle: 'Centralizator Comenzi', icon: Home },
  { to: '/emails', label: 'Emailuri Noi', icon: Mail, badgeKey: 'needsValidationEmails' },
  { to: '/pending-orders', label: 'Comenzi în Așteptare', icon: Clock, badgeKey: 'pendingOrders' },
  { to: '/sent-orders', label: 'Comenzi Importate', icon: Inbox, badgeKey: 'importedOrders' },
  { to: '/reports', label: 'Rapoarte', icon: BarChart3 },
  { to: '/technical-logs', label: 'Jurnal Tehnic', icon: ScrollText },
  { to: '/settings', label: 'Setări', icon: Settings, adminOnly: true },
]
