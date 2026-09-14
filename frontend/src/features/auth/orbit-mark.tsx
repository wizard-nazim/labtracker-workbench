const RINGS = [
  { tiltDeg: 0, durationS: 7, reverse: false },
  { tiltDeg: 60, durationS: 9, reverse: true },
  { tiltDeg: 120, durationS: 11, reverse: false },
]

const SQUASH = 0.42

// Atom/orbital decoration for the login page. Each ring is a plain circle
// whose parent is rotated + vertically squashed to *look* like a tilted
// ellipse; the electron dot sits on a plain circular path nested inside that
// same squashed parent, so it traces the visually-tilted ellipse exactly
// (CSS transforms compose) rather than needing real ellipse-path math.
export function OrbitMark({ className = 'size-40' }: { className?: string }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute inset-0 m-auto size-3.5 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />

      {RINGS.map(({ tiltDeg, durationS, reverse }) => (
        <div
          key={tiltDeg}
          className="absolute inset-0"
          style={{ transform: `rotate(${tiltDeg}deg) scaleY(${SQUASH})` }}
        >
          <div className="absolute inset-0 rounded-full border border-primary/25" />

          <div
            className="absolute inset-0"
            style={
              prefersReducedMotion
                ? undefined
                : {
                    animation: `labtracker-orbit ${durationS}s linear infinite${reverse ? ' reverse' : ''}`,
                  }
            }
          >
            <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          </div>
        </div>
      ))}
    </div>
  )
}
