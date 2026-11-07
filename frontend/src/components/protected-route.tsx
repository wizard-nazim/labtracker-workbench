import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { useMe } from '@/features/account/use-me'

const CHANGE_PASSWORD_PATH = '/change-password'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return <MustChangePasswordGate pathname={location.pathname}>{children}</MustChangePasswordGate>
}

// A temporary (admin-set) password has to be replaced before anything else.
// Waits for /auth/me so the app doesn't flash up first; if that request fails
// the app renders as before and its own error states take over.
function MustChangePasswordGate({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { data: me, isPending } = useMe()

  if (isPending) return null
  if (me?.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }
  return <>{children}</>
}
