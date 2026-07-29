import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { RequireAdmin } from '../components/auth/RequireAdmin'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { DashboardPage } from '../pages/DashboardPage'
import { EmailsPage } from '../pages/EmailsPage'
import { PendingOrdersPage } from '../pages/PendingOrdersPage'
import { SentOrdersPage } from '../pages/SentOrdersPage'
import { ReportsPage } from '../pages/ReportsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { UsersPage } from '../pages/UsersPage'
import { TechnicalLogsPage } from '../pages/TechnicalLogsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes: never wrapped by AppLayout/sidebar. */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Application routes: require a session. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/emails" element={<EmailsPage />} />
          <Route path="/pending-orders" element={<PendingOrdersPage />} />
          <Route path="/sent-orders" element={<SentOrdersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/technical-logs" element={<TechnicalLogsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/settings" element={<SettingsPage />} />
            {/* Not in navItems.ts / sidebar — reachable only via Settings'
                "Gestionează utilizatori" link, same as figura6-setari.png's
                own button/chevron affordance. */}
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
