import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { ChangePasswordForm } from './change-password-form'
import { useMe } from './use-me'

// Where ProtectedRoute sends anyone whose password an admin set. Nothing else
// in the app is reachable until they've chosen their own; signing out is.
export function ChangePasswordPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { data: me } = useMe()

  if (me && !me.mustChangePassword) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 pt-16 pb-8 sm:justify-center sm:pt-8">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-6">
        <KeyRound className="mb-3 size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Choose your password</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Your administrator set a temporary password for {me?.email ?? 'your account'}. Choose your own to carry on.
        </p>
        <ChangePasswordForm
          currentLabel="Temporary password"
          submitLabel="Save and continue"
          onChanged={() => {
            toast.success('Password saved.')
            navigate('/', { replace: true })
          }}
        />
        <Button variant="link" size="sm" className="mt-4 px-0" onClick={logout}>
          Sign out instead
        </Button>
      </div>
    </div>
  )
}
