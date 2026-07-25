import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth/useAuth'

// Not wired into router.tsx yet — prepared for the Settings/Outlook-connect
// guard in a later phase, where only Admin may connect Outlook.
export function RequireAdmin() {
  const { role, loading } = useAuth()

  if (loading) {
    return <p>Se încarcă...</p>
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
