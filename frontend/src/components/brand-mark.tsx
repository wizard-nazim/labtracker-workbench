import { cn } from 'cn'

export const DEPARTMENT_NAME = 'Department of Molecular and Cell Biology, University of Cape Town'
export const DEPARTMENT_URL = 'https://www.mcb.uct.ac.za/'

export function UctShield({ className }: { className?: string }) {
  return (
    <img
      src="/brand/uct-shield-128.png"
      srcSet="/brand/uct-shield-128.png 1x, /brand/uct-shield-256.png 2x"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('h-8 w-auto shrink-0 select-none', className)}
    />
  )
}

interface BrandLockupProps {
  /** Hide the department line (narrow top bars). */
  compact?: boolean
  className?: string
}

/** UCT shield followed by the product name and the department, used wherever
 *  the app identifies itself (sidebar, mobile sheet, mobile top bar). */
export function BrandLockup({ compact = false, className }: BrandLockupProps) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <UctShield className={compact ? 'h-7' : 'h-8'} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold tracking-tight text-foreground">LabTracker</span>
        {!compact && (
          <span className="truncate text-xs text-muted-foreground">Molecular and Cell Biology</span>
        )}
      </span>
    </span>
  )
}

export function BrandFooter() {
  return (
    <footer className="mt-10 flex items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
      <img
        src="/brand/mcb-dots.jpg"
        alt=""
        aria-hidden="true"
        width={28}
        height={28}
        className="size-7 shrink-0 rounded-sm ring-1 ring-brand-magenta/40"
      />
      <p className="min-w-0">
        {DEPARTMENT_NAME}.{' '}
        <a
          href={DEPARTMENT_URL}
          target="_blank"
          rel="noreferrer"
          className="whitespace-nowrap font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Department website<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </footer>
  )
}
