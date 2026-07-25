import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/useAuth'
import './AppLayout.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/emails', label: 'Emailuri noi' },
  { to: '/pending-orders', label: 'Comenzi in asteptare' },
  { to: '/sent-orders', label: 'Comenzi transmise/importate' },
  { to: '/reports', label: 'Rapoarte' },
  { to: '/settings', label: 'Setari' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <p className="app-sidebar-brand">MVT Order Hub</p>
        <nav>
          <ul className="app-sidebar-nav">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'app-sidebar-link app-sidebar-link-active' : 'app-sidebar-link'
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-header">
          {user && <span className="app-header-user">{user.email}</span>}
          <button className="app-header-logout" type="button" onClick={handleLogout}>
            Deconectare
          </button>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
