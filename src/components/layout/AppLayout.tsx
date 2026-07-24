import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/emails', label: 'Emailuri noi' },
  { to: '/pending-orders', label: 'Comenzi in asteptare' },
  { to: '/sent-orders', label: 'Comenzi transmise/importate' },
  { to: '/reports', label: 'Rapoarte' },
  { to: '/settings', label: 'Setari' },
]

export function AppLayout() {
  return (
    <div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
