import { useCallback, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { SplashScreen } from '@/components/splash-screen'
import { AuthTransitionOverlay } from '@/components/auth-transition-overlay'
import { ProtectedRoute } from '@/components/protected-route'
import { AppShell } from '@/components/app-shell'
import { LoginPage } from '@/features/auth/login-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { EquipmentListPage } from '@/features/equipment/equipment-list-page'
import { EquipmentDetailPage } from '@/features/equipment/equipment-detail-page'
import { BookingsPage } from '@/features/bookings/bookings-page'
import { UsageRecordsPage } from '@/features/usage/usage-records-page'
import { AdminPage } from '@/features/admin/admin-page'
import { AdminLayout } from '@/features/admin/admin-layout'
import {
  AdminEquipmentPage,
  AdminPeoplePage,
  AdminRequestsPage,
  AdminRoomsPage,
  AdminSettingsPage,
} from '@/features/admin/admin-pages'
import { ReportsPage } from '@/features/reports/reports-page'
import { AccountPage } from '@/features/account/account-page'
import { ChangePasswordPage } from '@/features/account/change-password-page'

export function App() {
  const [showSplash, setShowSplash] = useState(true)

  const hideSplash = useCallback(() => setShowSplash(false), [])

  // The router mounts behind the splash so pages start loading their data
  // straight away; `inert` keeps keyboard focus on the splash until it ends.
  return (
    <>
      <div className="contents" inert={showSplash}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/equipment" element={<EquipmentListPage />} />
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/usage" element={<UsageRecordsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminPage />} />
              <Route path="equipment" element={<AdminEquipmentPage />} />
              <Route path="rooms" element={<AdminRoomsPage />} />
              <Route path="people" element={<AdminPeoplePage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="requests" element={<AdminRequestsPage />} />
            </Route>
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {showSplash && <SplashScreen onComplete={hideSplash} />}
      <AuthTransitionOverlay />
      <Toaster />
    </>
  )
}
