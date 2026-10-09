import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MagicCard } from '@/components/ui/magic-card'
import { ThemeToggle } from '@/components/theme-toggle'
import { OrbitMark } from './orbit-mark'
import { LoginBackground } from './constellation-background'
import { GoogleSignInButton } from './google-sign-in-button'

function signInErrorMessage(err: unknown, method: 'password' | 'google'): string {
  if (err instanceof ApiError && err.status === 429) return 'Too many sign-in attempts. Try again in a minute.'
  if (err instanceof ApiError && err.status === 401) {
    return method === 'google'
      ? "This Google account isn't registered in LabTracker. Ask an admin to add your email."
      : 'Incorrect email or password.'
  }
  return 'Could not sign in right now. Please try again.'
}

export function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  async function signIn(method: 'password' | 'google', attempt: () => Promise<void>) {
    setError(null)
    setIsSubmitting(true)
    try {
      await attempt()
      navigate(from, { replace: true })
    } catch (err) {
      setError(signInErrorMessage(err, method))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void signIn('password', () => login(email, password))
  }

  // Already signed in (e.g. a bookmarked /login): go straight to the app.
  if (user && !isSubmitting) return <Navigate to={from} replace />

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-10 bg-background px-4 py-12 lg:flex-row lg:gap-16">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <LoginBackground />
      <div
        className="opacity-0 lg:order-2"
        style={{ animation: 'labtracker-fade-in 500ms ease-out forwards', animationDelay: '80ms' }}
      >
        <OrbitMark className="size-48 lg:size-56" />
      </div>

      <div
        className="w-full max-w-sm opacity-0"
        style={{ animation: 'labtracker-fade-in 500ms ease-out forwards' }}
      >
        <div className="mb-8 flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" className="size-6 text-primary" aria-hidden="true">
            <path
              d="M9 3v6.5L4.5 17a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L15 9.5V3M9 3h6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-lg font-semibold text-foreground">LabTracker</span>
        </div>

        <MagicCard
          className="rounded-md p-6"
          gradientFrom="var(--primary)"
          gradientTo="var(--primary)"
          gradientColor="var(--primary)"
          gradientOpacity={0.15}
        >
          <h1 className="text-base font-medium text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Molecular &amp; Cell Biology equipment system.</p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <GoogleSignInButton onCredential={(credential) => void signIn('google', () => loginWithGoogle(credential))} />
          </form>
        </MagicCard>
      </div>
    </div>
  )
}
