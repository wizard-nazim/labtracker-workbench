import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Inbox } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'

interface TableEmptyStateProps {
  colSpan: number
  title: string
  description?: string
  tone?: 'empty' | 'error'
  icon?: LucideIcon
}

export function TableEmptyState({ colSpan, title, description, tone = 'empty', icon }: TableEmptyStateProps) {
  const Icon = icon ?? (tone === 'error' ? AlertCircle : Inbox)

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <Icon
            className={`size-5 ${tone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
            aria-hidden="true"
          />
          <p className="text-sm text-foreground">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </TableCell>
    </TableRow>
  )
}
