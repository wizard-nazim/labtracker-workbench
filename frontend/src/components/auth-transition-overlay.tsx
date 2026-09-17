import { useAuth } from '@/context/auth-context'
import { Shapes80 } from '@/components/beste/piece/shapes80'

const CYCLE_MS = 4000

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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background p-6 opacity-0"
      style={{ animation: `labtracker-overlay-cycle ${CYCLE_MS}ms ease-in-out forwards` }}
      onAnimationEnd={clearTransition}
      role="status"
    >
      <Shapes80 tone="primary" />
    </div>
  )
}
