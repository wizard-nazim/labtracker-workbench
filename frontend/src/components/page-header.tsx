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
    <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-md border border-border bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/5">
      <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
