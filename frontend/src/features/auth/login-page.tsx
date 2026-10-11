import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { DEPARTMENT_NAME, UctShield } from '@/components/brand-mark'
import { BrandFooter } from '@/components/brand-footer'
import { ChemistryMark } from '@/components/chemistry-mark'
import { FloatingPathsBackground } from '@/components/ui/floating-paths'

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
      {/* The one bold moment in the app: the department's own building, shown
          clearly. A navy scrim rises only from the bottom edge, behind the
          headline, and is gone by about half the height (a little higher on
          the short phone band, where the text takes up more of it). It stays
          dark enough under the text for white to clear 4.5:1. */}
      <section
        aria-label="LabTracker, Molecular and Cell Biology"
        className="relative isolate flex h-60 flex-col justify-between overflow-hidden bg-brand-navy p-5 text-white [--scrim-end:72%] sm:h-72 sm:p-8 lg:h-auto lg:min-h-svh lg:p-12 lg:[--scrim-end:48%]"
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
            background: [
              // A hint of MCB magenta in the bottom corner.
              'radial-gradient(70% 30% at 100% 100%, rgb(176 23 127 / 0.4) 0%, rgb(176 23 127 / 0) 100%)',
              // Navy from the bottom edge, transparent by --scrim-end.
              'linear-gradient(to top, rgb(18 28 92 / 0.95) 0%, rgb(28 44 132 / 0.88) calc(var(--scrim-end) * 0.55), rgb(28 44 132 / 0) var(--scrim-end))',
              // Light shade at the very top so the logos read on bright sky.
              'linear-gradient(to bottom, rgb(12 20 50 / 0.3) 0%, rgb(12 20 50 / 0) 22%)',
            ].join(', '),
          }}
        />
        {/* Brand edge: magenta into UCT blue along the seam with the form. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-magenta to-brand-blue lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:h-auto lg:w-1 lg:bg-gradient-to-b"
        />

        <div className="flex items-center gap-4 [filter:drop-shadow(0_1px_4px_rgb(0_0_0/0.45))]">
          <UctShield className="h-11 sm:h-14 lg:h-16" />
          <span className="h-9 w-px bg-white/60 sm:h-12" aria-hidden="true" />
          <img
            src="/brand/mcb-mark.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-11 w-auto select-none sm:h-14 lg:h-16"
          />
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-medium text-white lg:text-base">LabTracker</p>
          <p className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl lg:text-5xl lg:leading-[1.05]">
            Book and track MCB lab equipment
          </p>
          <p className="mt-3 hidden max-w-md text-sm text-white/90 sm:block lg:mt-5">{DEPARTMENT_NAME}</p>
        </div>
      </section>

      {/* Faint brand-tinted paths drift behind the form; the form itself sits
          on a near-opaque surface so its text keeps full contrast. */}
      <FloatingPathsBackground
        position={1}
        className="flex flex-1 flex-col px-4 pt-14 pb-4 sm:px-8 lg:min-h-svh lg:pt-12"
      >
        <div className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col items-center lg:justify-center">
          <div
            className="w-full max-w-sm rounded-xl bg-background/85 p-5 opacity-0 ring-1 ring-border/70 backdrop-blur-sm sm:p-6"
            style={{ animation: 'labtracker-fade-in 500ms ease-out 200ms forwards' }}
          >
            <ChemistryMark className="mb-4 size-14" />
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

        <BrandFooter className="-mx-4 -mb-4 sm:-mx-8 sm:px-8" />
      </FloatingPathsBackground>
    </div>
  )
}
