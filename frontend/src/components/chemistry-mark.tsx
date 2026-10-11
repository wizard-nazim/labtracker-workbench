import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/*
 * LabTracker's animated mark: an Erlenmeyer flask in MCB navy with UCT-blue
 * liquid, bubbles rising through it and two electrons orbiting the glass.
 * One electron is magenta, the only brand-magenta on the sign-in screen.
 * With "reduce motion" on, it renders as a still drawing.
 *
 * Colours come from tokens: the glass is currentColor (set text-primary on
 * the parent), the liquid and orbits use --brand-blue, so it follows the
 * light/dark theme without extra props.
 */

const CX = 32
const CY = 35
const RX = 29
const RY = 9.5

// An ellipse as a path, so <animateMotion> can follow it.
const ORBIT_PATH = `M ${CX - RX} ${CY} a ${RX} ${RY} 0 1 0 ${RX * 2} 0 a ${RX} ${RY} 0 1 0 ${-RX * 2} 0`

const FLASK_PATH = 'M26 9h12M27.5 9v14.5L14.2 47.6A4.4 4.4 0 0 0 18 54.2h28a4.4 4.4 0 0 0 3.8-6.6L36.5 23.5V9'
// Same outline closed off below the liquid line, used as a clip for the fill.
const FLASK_INNER = 'M27.5 9v14.5L14.2 47.6A4.4 4.4 0 0 0 18 54.2h28a4.4 4.4 0 0 0 3.8-6.6L36.5 23.5V9z'

const BUBBLES = [
  { x: 27, r: 1.6, delay: 0, duration: 2.6 },
  { x: 33.5, r: 1.1, delay: 0.9, duration: 2.2 },
  { x: 38, r: 1.4, delay: 1.6, duration: 2.8 },
  { x: 30.5, r: 0.9, delay: 2.1, duration: 2.0 },
]

const ORBITS = [
  { angle: -22, duration: 3.6, electron: 'var(--brand-blue)', begin: '0s', staticAt: { x: CX + RX, y: CY } },
  { angle: 24, duration: 4.8, electron: 'var(--brand-magenta)', begin: '-1.8s', staticAt: { x: CX - RX, y: CY } },
]

interface ChemistryMarkProps {
  className?: string
  /** Accessible name. Leave empty when the mark sits next to visible text. */
  label?: string
}

export function ChemistryMark({ className, label }: ChemistryMarkProps) {
  const reduceMotion = useReducedMotion()
  const clipId = useId()

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn('size-14 text-primary', className)}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={FLASK_INNER} />
        </clipPath>
      </defs>

      {/* Orbits behind the glass */}
      {ORBITS.map((orbit) => (
        <path
          key={`ring-${orbit.angle}`}
          d={ORBIT_PATH}
          transform={`rotate(${orbit.angle} ${CX} ${CY})`}
          stroke="var(--brand-blue)"
          strokeOpacity={0.35}
          strokeWidth={0.9}
        />
      ))}

      {/* Liquid and bubbles, clipped to the inside of the flask */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="37" width="64" height="20" fill="var(--brand-blue)" fillOpacity={0.22} />
        <path d="M10 37.5c4.5-1.6 8.5 1.6 13 0s8.5-1.6 13 0 8.5 1.6 13 0 8.5-1.6 13 0" stroke="var(--brand-blue)" strokeWidth={1.4} strokeLinecap="round" />
        {BUBBLES.map((bubble) =>
          reduceMotion ? (
            <circle key={bubble.x} cx={bubble.x} cy={46 - bubble.r * 2} r={bubble.r} fill="var(--brand-blue)" fillOpacity={0.7} />
          ) : (
            <motion.circle
              key={bubble.x}
              cx={bubble.x}
              r={bubble.r}
              fill="var(--brand-blue)"
              initial={{ cy: 53, opacity: 0 }}
              animate={{ cy: [53, 38], opacity: [0, 0.85, 0] }}
              transition={{
                duration: bubble.duration,
                delay: bubble.delay,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeOut',
              }}
            />
          ),
        )}
      </g>

      {/* Glass */}
      <path d={FLASK_PATH} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 14v6" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.4} strokeLinecap="round" />

      {/* Electrons */}
      {ORBITS.map((orbit) => (
        <g key={`electron-${orbit.angle}`} transform={`rotate(${orbit.angle} ${CX} ${CY})`}>
          {reduceMotion ? (
            <circle cx={orbit.staticAt.x} cy={orbit.staticAt.y} r={2.3} fill={orbit.electron} />
          ) : (
            <circle r={2.3} fill={orbit.electron}>
              <animateMotion dur={`${orbit.duration}s`} begin={orbit.begin} repeatCount="indefinite" path={ORBIT_PATH} />
            </circle>
          )}
        </g>
      ))}
    </svg>
  )
}
