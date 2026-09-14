import { useAuth } from '@/context/auth-context'
import { OrbitMark } from '@/features/auth/orbit-mark'

const CYCLE_MS = 1800

const CAPTION = {
  login: 'Welcome back',
  logout: 'Signed out',
} as const

// Reduced-motion is handled at the source (auth-context.tsx only sets
// `transition` when motion is allowed), so this component can stay purely
// declarative: one CSS animation drives fade-in/hold/fade-out, and its own
// end event clears the transition — no effects, no synchronous setState.
export function AuthTransitionOverlay() {
  const { transition, clearTransition } = useAuth()

  if (!transition) return null

  return (
    <div
      key={transition}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background opacity-0"
      style={{ animation: `labtracker-overlay-cycle ${CYCLE_MS}ms ease-in-out forwards` }}
      onAnimationEnd={clearTransition}
      role="status"
    >
      <OrbitMark className="size-32 sm:size-40" />
      <p className="text-sm font-medium text-foreground">{CAPTION[transition]}</p>
    </div>
  )
}
