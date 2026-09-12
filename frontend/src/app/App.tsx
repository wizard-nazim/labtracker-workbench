import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { SplashScreen } from '@/components/splash-screen'
import { ProtectedRoute } from '@/components/protected-route'
import { AppShell } from '@/components/app-shell'
import { LoginPage } from '@/features/auth/login-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { EquipmentListPage } from '@/features/equipment/equipment-list-page'
import { BookingsPage } from '@/features/bookings/bookings-page'
import { UsageRecordsPage } from '@/features/usage/usage-records-page'
import { AdminPage } from '@/features/admin/admin-page'

export function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/equipment" element={<EquipmentListPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/usage" element={<UsageRecordsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}
