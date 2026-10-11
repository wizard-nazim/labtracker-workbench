import { cn } from '@/lib/utils'
import { DEPARTMENT_NAME, DEPARTMENT_URL } from '@/components/brand-mark'

/**
 * The MCB department footer, shared by the app shell and the login page.
 * A solid MCB-navy band (a deeper navy in dark mode so it still stands apart
 * from the #0C1424 page) under a thin magenta-to-UCT-blue rule. Text is
 * near-white (over 9:1 on both navies); the link is underlined and takes a
 * white focus ring. Callers add their own margins to make it full-bleed.
 */
export function BrandFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'relative mt-10 flex items-center gap-3 bg-brand-navy px-4 py-4 text-xs text-white/85 dark:bg-[#141f63]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-magenta to-brand-blue"
      />
      <img
        src="/brand/mcb-dots.jpg"
        alt=""
        aria-hidden="true"
        width={28}
        height={28}
        className="size-7 shrink-0 rounded-sm ring-1 ring-white/40"
      />
      <p className="min-w-0">
        {DEPARTMENT_NAME}.{' '}
        <a
          href={DEPARTMENT_URL}
          target="_blank"
          rel="noreferrer"
          className="whitespace-nowrap font-medium text-white underline decoration-white/60 underline-offset-4 hover:decoration-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Department website<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </footer>
  )
}
