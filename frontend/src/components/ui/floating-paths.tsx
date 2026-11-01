import { useMemo, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

// Adapted from the 21st.dev "floating paths" background. Strokes follow
// currentColor (navy in light, light blue in dark via text-primary) and stay
// faint so text placed on top keeps its contrast. The drawing stretches to
// fill any panel shape; non-scaling strokes keep the line weights even. Durations are derived from
// the path index (stable across renders), and with "reduce motion" on the paths are drawn still.

function FloatingPaths({ position }: { position: number }) {
  const reduceMotion = useReducedMotion()

  const paths = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.5 + i * 0.03,
        opacity: 0.05 + i * 0.012,
        // Spread of 20–30 s that looks random but is the same on every render.
        duration: 20 + ((i * 37 + position * 11) % 100) / 10,
      })),
    [position],
  )

  return (
    <svg
      className="absolute inset-0 size-full text-primary"
      viewBox="0 0 696 316"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((path) =>
        reduceMotion ? (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: [0.3, 0.6, 0.3], pathOffset: [0, 1, 0] }}
            transition={{ duration: path.duration, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          />
        ),
      )}
    </svg>
  )
}

interface FloatingPathsBackgroundProps {
  /** 1 and -1 mirror the sweep; pass both via `mirrored` for the layered look. */
  position: number
  mirrored?: boolean
  className?: string
  children: ReactNode
}

export function FloatingPathsBackground({ position, mirrored = false, className, children }: FloatingPathsBackgroundProps) {
  return (
    <div className={cn('relative isolate w-full', className)}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <FloatingPaths position={position} />
        {mirrored && <FloatingPaths position={-position} />}
      </div>
      {children}
    </div>
  )
}
