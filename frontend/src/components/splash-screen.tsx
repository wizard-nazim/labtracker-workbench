import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { UctShield } from '@/components/brand-mark'
import { ChemistryMark } from '@/components/chemistry-mark'
import { Button } from '@/components/ui/button'

const DURATION_MS = 10_000
const REDUCED_DURATION_MS = 1_000
const FADE_MS = 500
const TICK_MS = 250

const STATUS_LINES = [
  'Preparing your lab…',
  'Checking the equipment list…',
  'Loading bookings…',
  'Calibrating the instruments…',
  'Almost ready…',
]

/**
 * Branded splash shown on every load. It sits on top of the app, which is
 * already mounted underneath and fetching its data. It fills a progress bar
 * over ten seconds, then fades out. "Skip" or Esc ends it early; with
 * "reduce motion" on it ends after about a second.
 */
export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const reduceMotion = useReducedMotion()
  const duration = reduceMotion ? REDUCED_DURATION_MS : DURATION_MS
  const [elapsed, setElapsed] = useState(0)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [barStarted, setBarStarted] = useState(false)
  const finishedRef = useRef(false)

  // The bar fills with one long compositor transition (smooth even while the
  // app renders underneath); the timer below drives the text and aria value.
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setBarStarted(true)))
    return () => cancelAnimationFrame(frame)
  }, [])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    setIsFadingOut(true)
    window.setTimeout(onComplete, reduceMotion ? 0 : FADE_MS)
  }, [onComplete, reduceMotion])

  useEffect(() => {
    const startedAt = performance.now()
    const interval = window.setInterval(() => {
      const next = Math.min(performance.now() - startedAt, duration)
      setElapsed(next)
      if (next >= duration) {
        window.clearInterval(interval)
        finish()
      }
    }, TICK_MS)
    return () => window.clearInterval(interval)
  }, [duration, finish])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finish])

  const progress = Math.round((elapsed / duration) * 100)
  const lineIndex = Math.min(
    STATUS_LINES.length - 1,
    Math.floor((elapsed / duration) * STATUS_LINES.length),
  )

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-background"
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* z-[200] sits above the onboarding tour (z 100), which may start underneath. */}
      {/* Brand edge, the same magenta-to-blue seam as the login photo. */}
      <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-brand-magenta via-brand-navy to-brand-blue" />

      <div className="flex justify-end p-3 sm:p-4">
        <Button type="button" variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
          Skip
          <kbd className="ml-1 hidden rounded border border-border px-1 font-sans text-[11px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="flex items-center gap-4" aria-hidden="true">
          <UctShield className="h-12 sm:h-14" />
          <span className="h-10 w-px bg-border" />
          <img
            src="/brand/mcb-mark.png"
            alt=""
            draggable={false}
            className="h-12 w-auto select-none rounded-md bg-brand-navy p-1 sm:h-14"
          />
        </div>

        <ChemistryMark className="mt-10 size-24 sm:size-28" />

        <p className="mt-6 text-2xl font-semibold tracking-tight text-foreground">LabTracker</p>
        <p className="mt-1 text-center text-sm text-muted-foreground">Molecular and Cell Biology, University of Cape Town</p>

        <div className="mt-10 w-full max-w-xs">
          <div
            role="progressbar"
            aria-label="Loading LabTracker"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-brand-navy to-brand-blue dark:from-brand-blue dark:to-primary"
              style={{
                transform: `scaleX(${barStarted ? 1 : 0})`,
                transition: `transform ${duration}ms linear`,
              }}
            />
          </div>
          <p role="status" aria-live="polite" className="mt-3 text-center text-sm text-muted-foreground">
            {STATUS_LINES[lineIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}
