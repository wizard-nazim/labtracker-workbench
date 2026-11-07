import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div data-tour="page-header" className="flex flex-col items-start justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground wrap-anywhere">{description}</p>
        </div>
      </div>
      {action && <div data-tour="page-action" className="w-full sm:w-auto">{action}</div>}
    </div>
  )
}
