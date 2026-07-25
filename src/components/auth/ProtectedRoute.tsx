import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth/useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return <p>Se încarcă...</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
