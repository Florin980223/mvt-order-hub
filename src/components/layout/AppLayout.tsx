import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, ChevronDown, Headset } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/useAuth'
import { useEmailsQuery } from '../../lib/emails/useEmailsQuery'
import { useMailConnectionQuery } from '../../lib/settings/useMailConnectionQuery'
import { formatConnectionStatus } from '../../lib/settings/format'
import { useNotificationsQuery } from '../../lib/notifications/useNotificationsQuery'
import { useMarkNotificationReadMutation } from '../../lib/notifications/useMarkNotificationReadMutation'
import { navItems, type BadgeKey } from './navItems'
import './AppLayout.css'

const CONNECTION_PILL_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  connected: 'success',
  connecting: 'warning',
  expiring_soon: 'warning',
  disconnected: 'error',
  error: 'error',
}

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

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || role === 'admin')
  const currentNavItem = navItems.find((item) => item.to === location.pathname)
  const currentPageTitle = currentNavItem?.headerTitle ?? currentNavItem?.label ?? 'MVT Order Hub'

  const { data: emailsData } = useEmailsQuery()
  const { data: connection } = useMailConnectionQuery()
  const { data: notificationsData } = useNotificationsQuery()
  const markReadMutation = useMarkNotificationReadMutation()

  const badgeCounts = useMemo<Record<BadgeKey, number>>(() => {
    const emails = emailsData ?? []
    const orders = emails.flatMap((email) => email.orders)
    return {
      needsValidationEmails: emails.filter((email) => email.status === 'needs_validation').length,
      pendingOrders: orders.filter((order) => order.status === 'needs_validation').length,
      importedOrders: orders.filter((order) => order.status === 'imported').length,
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

            <div className="app-notifications">
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

            {user && (
              <div className="app-user-menu">
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
