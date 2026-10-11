import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { DEPARTMENT_NAME, UctShield } from '@/components/brand-mark'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
      navigate(from, { replace: true })
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* The one bold moment in the app: the department's own building under a
          navy wash. The wash never drops below 85% where text sits, so white
          text stays above 4.5:1 whatever part of the photo is behind it. */}
      <section
        aria-label="LabTracker, Molecular and Cell Biology"
        className="relative isolate flex h-60 flex-col justify-between overflow-hidden bg-brand-navy p-5 text-white sm:h-72 sm:p-8 lg:h-auto lg:min-h-svh lg:p-12"
      >
        <img
          src="/brand/campus.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover object-[center_35%]"
          style={{ animation: 'labtracker-photo-settle 1800ms cubic-bezier(0.2, 0.7, 0.2, 1) both' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(120% 80% at 100% 0%, rgb(176 23 127 / 0.5) 0%, rgb(176 23 127 / 0) 55%), linear-gradient(to top, rgb(28 44 132 / 0.95) 0%, rgb(28 44 132 / 0.88) 55%, rgb(28 44 132 / 0.7) 100%)',
          }}
        />
        {/* Brand edge: magenta into UCT blue along the seam with the form. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-magenta to-brand-blue lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:h-auto lg:w-1 lg:bg-gradient-to-b"
        />

        <div className="flex items-center gap-4">
          <UctShield className="h-11 sm:h-14 lg:h-16" />
          <span className="h-9 w-px bg-white/30 sm:h-12" aria-hidden="true" />
          <img
            src="/brand/mcb-mark.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-11 w-auto select-none sm:h-14 lg:h-16"
          />
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-medium text-white/90 lg:text-base">LabTracker</p>
          <p className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:text-5xl lg:leading-[1.05]">
            Book and track MCB lab equipment
          </p>
          <p className="mt-3 hidden max-w-md text-sm text-white/85 sm:block lg:mt-5">{DEPARTMENT_NAME}</p>
        </div>
      </section>

      <div className="relative flex flex-1 flex-col items-center px-4 pt-14 pb-10 sm:px-8 lg:justify-center lg:py-12">
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <ThemeToggle />
        </div>

        <div
          className="w-full max-w-sm opacity-0"
          style={{ animation: 'labtracker-fade-in 500ms ease-out 200ms forwards' }}
        >
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use your LabTracker email and password.</p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                className="h-10"
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
                className="h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2 h-10">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
