import { useId, type ComponentProps, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

// One admin list: a heading, a line on what it holds, its single Add button,
// then the list itself.
export function AdminSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3" data-tour="admin-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-[13px] text-muted-foreground">{description}</p>
        </div>
        {action && (
          <div className="shrink-0" data-tour="admin-add">
            {action}
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

// The page's primary "Add …" button. Spreads its props so it works as an
// asChild dialog trigger.
export function AddButton({ children, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button {...props} className="h-9 w-full sm:w-auto">
      <Plus aria-hidden="true" />
      {children}
    </Button>
  )
}
