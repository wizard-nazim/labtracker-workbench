import { cn } from '@/lib/utils'
import { DEPARTMENT_NAME, DEPARTMENT_URL } from '@/components/brand-mark'

/** The MCB department footer, shared by the app shell and the login page. */
export function BrandFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-10 flex items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground', className)}>
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
