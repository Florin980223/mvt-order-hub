import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, ChevronDown, Headset, HelpCircle, Mail, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/useAuth'
import { useEmailsQuery } from '../../lib/emails/useEmailsQuery'
import { useMailConnectionQuery } from '../../lib/settings/useMailConnectionQuery'
import { formatConnectionStatus } from '../../lib/settings/format'
import { useNotificationsQuery } from '../../lib/notifications/useNotificationsQuery'
import { useMarkNotificationReadMutation } from '../../lib/notifications/useMarkNotificationReadMutation'
import { useThemePreferenceEffect } from '../../lib/settings/useThemePreferenceEffect'
import { navItems, type BadgeKey } from './navItems'
import './AppLayout.css'

const CONNECTION_PILL_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  connected: 'success',
  connecting: 'warning',
  expiring_soon: 'warning',
  disconnected: 'error',
  error: 'error',
}

// Static FAQ content for the header help panel — plain-text answers, no
// backend/CMS. Kept short on purpose (Task: "genuinely useful but simple").
const HELP_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Cum trimit o comandă în AscendTMS?',
    answer:
      'Deschide comanda din "Comenzi în Așteptare", verifică datele extrase și apasă butonul de import către AscendTMS din bara de acțiuni a comenzii.',
  },
  {
    question: 'Cum corectez datele extrase de AI?',
    answer:
      'În panoul de detalii al comenzii, editează direct câmpurile completate automat; corecțiile se salvează înainte de trimiterea comenzii spre import.',
  },
  {
    question: 'Ce înseamnă scorul de încredere AI?',
    answer:
      'Arată cât de sigur este AI-ul de datele extrase dintr-un email. Scorurile mici semnalează câmpuri care merită verificate manual înainte de import.',
  },
  {
    question: 'Cum conectez mailbox-ul Outlook al companiei?',
    answer: 'Din "Setări" → secțiunea de conexiune email, autorizează contul Outlook; starea conexiunii apare apoi în antet.',
  },
  {
    question: 'Cum exportez un raport?',
    answer: 'Din pagina "Rapoarte", alege intervalul de date dorit și apasă "Exportă raport" pentru a descărca un fișier CSV.',
  },
]

function initialsOf(fullName: string | null, email: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }
  return email?.[0]?.toUpperCase() ?? '?'
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, fullName } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // Outside-click-to-close for the 3 header popovers — same pattern used
  // site-wide for every other popover panel (Dashboard/Emails/PendingOrders/
  // SentOrders filter/sort/history panels): a ref wrapping trigger+panel,
  // and a single document mousedown listener that closes whichever popover
  // is open when the click lands outside its own wrapper. Previously none
  // of these 3 had this — closing required clicking the trigger button
  // again, flagged explicitly for the help icon.
  const notificationsRef = useRef<HTMLDivElement>(null)
  const helpRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notificationsOpen && !helpOpen && !userMenuOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (notificationsOpen && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false)
      }
      if (helpOpen && helpRef.current && !helpRef.current.contains(target)) {
        setHelpOpen(false)
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen, helpOpen, userMenuOpen])

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || role === 'admin')
  const currentNavItem = navItems.find((item) => item.to === location.pathname)
  const currentPageTitle = currentNavItem?.headerTitle ?? currentNavItem?.label ?? 'MVT Order Hub'

  const { data: emailsData } = useEmailsQuery()
  const { data: connection } = useMailConnectionQuery()
  const { data: notificationsData } = useNotificationsQuery()
  const markReadMutation = useMarkNotificationReadMutation()

  // Admin-only in effect (app_settings RLS), but applied here rather than
  // only on SettingsPage so the preference actually persists across
  // navigation instead of resetting the moment you leave Settings.
  useThemePreferenceEffect()

  const badgeCounts = useMemo<Record<BadgeKey, number>>(() => {
    const emails = emailsData ?? []
    const orders = emails.flatMap((email) => email.orders)
    return {
      needsValidationEmails: emails.filter((email) => email.status === 'needs_validation').length,
      pendingOrders: orders.filter((order) => order.status === 'needs_validation').length,
      // Matches SentOrdersPage's own SENT_STATUSES filter (imported +
      // import_failed) — previously imported-only, which silently
      // diverged from what that page actually shows.
      importedOrders: orders.filter((order) => order.status === 'imported' || order.status === 'import_failed').length,
    }
  }, [emailsData])

  const notifications = notificationsData ?? []
  const unreadCount = notifications.filter((notification) => notification.read_at === null).length

  const connectionVariant = connection ? (CONNECTION_PILL_VARIANT[connection.status] ?? 'error') : null

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function handleNotificationClick(notificationId: string, readAt: string | null) {
    if (readAt === null) markReadMutation.mutate(notificationId)
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <img src="/logo-mvt.png" alt="MVT Logistics Timișoara" className="app-sidebar-brand__logo" />
        </div>

        <div className="app-sidebar-body">
        <nav>
          <ul className="app-sidebar-nav">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : undefined
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? 'app-sidebar-link app-sidebar-link-active' : 'app-sidebar-link'
                    }
                  >
                    <Icon aria-hidden="true" size={18} className="app-sidebar-link__icon" />
                    <span className="app-sidebar-link__label">{item.label}</span>
                    {!!badgeCount && (
                      <span
                        className={
                          item.badgeKey === 'needsValidationEmails'
                            ? 'app-sidebar-badge app-sidebar-badge--urgent'
                            : 'app-sidebar-badge'
                        }
                      >
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="app-sidebar-footer">
          <Headset aria-hidden="true" size={16} />
          <div className="app-sidebar-footer__text">
            <span className="app-sidebar-footer__label">Suport</span>
            <span>help@mvtlogistics.ro</span>
            <span>+40 336 100 200</span>
          </div>
        </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <h2 className="app-header-title">{currentPageTitle}</h2>

          <div className="app-header-actions">
            {connection && connectionVariant && (
              <span className={`app-connection-pill app-connection-pill--${connectionVariant}`}>
                {connection.status === 'connected' && (
                  <CheckCircle2 aria-hidden="true" size={14} className="app-connection-pill__icon" />
                )}
                {formatConnectionStatus(connection.status)}
                {connection.status === 'connected' ? ' la Outlook' : ''}
              </span>
            )}

            <div className="app-notifications" ref={notificationsRef}>
              <button
                type="button"
                className="app-notifications-bell"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label="Notificări"
              >
                <Bell aria-hidden="true" size={20} />
                {unreadCount > 0 && <span className="app-notifications-badge">{unreadCount}</span>}
              </button>

              {notificationsOpen && (
                <div className="app-notifications-panel">
                  {notifications.length === 0 && <p className="app-notifications-empty">Nicio notificare.</p>}
                  {notifications.slice(0, 10).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="app-notifications-item"
                      onClick={() => handleNotificationClick(notification.id, notification.read_at)}
                    >
                      {notification.read_at === null && <span className="app-notifications-dot" />}
                      <span className="app-notifications-item__title">{notification.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Only figura3-comenzi-asteptare.png actually shows this icon —
                the other 5 mockups don't. Added app-wide anyway (not gated
                to PendingOrdersPage) since AppLayout's header is the same
                shared chrome on every page and a generic help icon is
                harmless regardless of page. Now wired to a static help
                panel (contact info reused from the sidebar's own "Suport"
                block + a short FAQ) — same open/close pattern as the
                notification bell above. */}
            <div className="app-help" ref={helpRef}>
              <button
                type="button"
                className="app-header-help"
                onClick={() => setHelpOpen((open) => !open)}
                aria-label="Ajutor"
              >
                <HelpCircle aria-hidden="true" size={20} />
              </button>

              {helpOpen && (
                <div className="app-help-panel">
                  <div className="app-help-panel__section">
                    <span className="app-help-panel__heading">Suport</span>
                    <a href="mailto:help@mvtlogistics.ro" className="app-help-panel__contact">
                      <Mail aria-hidden="true" size={14} />
                      help@mvtlogistics.ro
                    </a>
                    <a href="tel:+40336100200" className="app-help-panel__contact">
                      <Phone aria-hidden="true" size={14} />
                      +40 336 100 200
                    </a>
                  </div>

                  <div className="app-help-panel__section">
                    <span className="app-help-panel__heading">Linkuri utile</span>
                    <Link to="/pending-orders" className="app-help-panel__link" onClick={() => setHelpOpen(false)}>
                      Comenzi în așteptare
                    </Link>
                    <Link to="/settings" className="app-help-panel__link" onClick={() => setHelpOpen(false)}>
                      Conectare mailbox (Setări)
                    </Link>
                    <Link to="/reports" className="app-help-panel__link" onClick={() => setHelpOpen(false)}>
                      Rapoarte și export
                    </Link>
                  </div>

                  <div className="app-help-panel__section">
                    <span className="app-help-panel__heading">Întrebări frecvente</span>
                    {HELP_FAQ.map((item) => (
                      <details key={item.question} className="app-help-panel__faq">
                        <summary>{item.question}</summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="app-user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="app-header-user"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  aria-label="Meniu utilizator"
                >
                  <span className="app-header-avatar">{initialsOf(fullName, user.email ?? null)}</span>
                  <span className="app-header-user__text">
                    <span className="app-header-user__name">{fullName ?? user.email}</span>
                    <span className="app-header-user__role">{role === 'admin' ? 'Administrator' : 'Operator'}</span>
                  </span>
                  <ChevronDown aria-hidden="true" size={16} className="app-header-user__chevron" />
                </button>

                {userMenuOpen && (
                  <div className="app-user-menu-panel">
                    <button type="button" className="app-user-menu-item" onClick={handleLogout}>
                      Deconectare
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
