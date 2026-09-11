import { useEffect, useState } from 'react'

const COLUMNS = 12
const ROWS = 8
const STAGGER_MS = 12
const FADE_OUT_START_MS = 1050
const FADE_OUT_DURATION_MS = 450

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      onComplete()
      return
    }

    const fadeTimer = setTimeout(() => setIsFadingOut(true), FADE_OUT_START_MS)
    const doneTimer = setTimeout(onComplete, FADE_OUT_START_MS + FADE_OUT_DURATION_MS)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-background"
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_DURATION_MS}ms ease-out`,
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      <span className="sr-only" role="status">
        Loading LabTracker
      </span>
      <div
        className="grid gap-[5px]"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: ROWS * COLUMNS }).map((_, i) => {
          const row = Math.floor(i / COLUMNS)
          const col = i % COLUMNS
          const delay = (row + col) * STAGGER_MS
          return (
            <span
              key={i}
              className="size-2.5 rounded-full border border-primary/40 sm:size-3"
              style={{
                animation: 'labtracker-well-fill 260ms ease-out forwards',
                animationDelay: `${delay}ms`,
              }}
            />
          )
        })}
      </div>
      <p
        className="text-sm font-medium text-foreground opacity-0"
        style={{
          animation: 'labtracker-fade-in 400ms ease-out forwards',
          animationDelay: `${(ROWS - 1 + COLUMNS - 1) * STAGGER_MS + 280}ms`,
        }}
        aria-hidden="true"
      >
        LabTracker
      </p>
    </div>
  )
}
