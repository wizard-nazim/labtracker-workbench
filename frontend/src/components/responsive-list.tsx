import { useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Inbox, MoreHorizontal, Search, SearchX } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsDesktop } from '@/hooks/use-media-query'

export interface ListColumn<T> {
  key: string
  header: ReactNode
  cell: (item: T) => ReactNode
  // Applied to the header and every cell of the column.
  className?: string
  // Extra header props, e.g. aria-sort on a sortable column.
  headProps?: ComponentProps<typeof TableHead>
}

interface ResponsiveListProps<T> {
  items: T[] | undefined
  isLoading?: boolean
  isError?: boolean
  getKey: (item: T) => string | number
  // Desktop (md and up): a table with these columns.
  columns: ListColumn<T>[]
  // Phones: one card per item.
  renderCard: (item: T) => ReactNode
  // The row's ⋯ menu (usually a <RowActionsMenu> plus the dialogs it opens).
  renderActions?: (item: T) => ReactNode
  // Client-side search over the text this returns for each item.
  search?: { label: string; placeholder: string; text: (item: T) => string }
  // Controls shown next to the search box (filters, sort, toggles).
  toolbar?: ReactNode
  // What to call the list in the error message, e.g. "rooms".
  noun: string
  empty: { title: string; description?: string; action?: ReactNode }
  rowClassName?: (item: T) => string | undefined
}

// One list that's a table on desktop and stacked cards on phones, so every
// admin screen reads and behaves the same at any width.
export function ResponsiveList<T>({
  items,
  isLoading = false,
  isError = false,
  getKey,
  columns,
  renderCard,
  renderActions,
  search,
  toolbar,
  noun,
  empty,
  rowClassName,
}: ResponsiveListProps<T>) {
  const isDesktop = useIsDesktop()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible =
    search && needle ? (items ?? []).filter((item) => search.text(item).toLowerCase().includes(needle)) : (items ?? [])

  let state: ReactNode = null
  if (isError) {
    state = (
      <ListState
        icon={AlertCircle}
        tone="error"
        title={`Couldn't load ${noun}.`}
        description="Check your connection and reload the page."
      />
    )
  } else if (!isLoading && items?.length === 0) {
    state = <ListState icon={Inbox} title={empty.title} description={empty.description} action={empty.action} />
  } else if (!isLoading && visible.length === 0) {
    state = (
      <ListState
        icon={SearchX}
        title={`Nothing matches "${query.trim()}".`}
        action={
          <Button size="sm" variant="outline" onClick={() => setQuery('')}>
            Clear search
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {(search || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {search && (
            <div className="relative min-w-0 sm:max-w-xs sm:flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label={search.label}
                placeholder={search.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {isDesktop ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead key={column.key} {...column.headProps} className={cn(column.className, column.headProps?.className)}>
                    {column.header}
                  </TableHead>
                ))}
                {renderActions && (
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell colSpan={columns.length + (renderActions ? 1 : 0)}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                !isError &&
                visible.map((item) => (
                  <TableRow key={getKey(item)} className={rowClassName?.(item)}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={cn('whitespace-normal', column.className)}>
                        {column.cell(item)}
                      </TableCell>
                    ))}
                    {renderActions && <TableCell className="w-12 text-right">{renderActions(item)}</TableCell>}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {state}
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}
          {state && <div className="rounded-lg border border-border bg-card">{state}</div>}
          {!isLoading && !isError && visible.length > 0 && (
            <ul className="flex flex-col gap-2">
              {visible.map((item) => (
                <li key={getKey(item)}>
                  <Card size="sm" className={cn('flex-row items-start gap-2 px-3', rowClassName?.(item))}>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">{renderCard(item)}</div>
                    {renderActions && <div className="-my-1 -mr-1 shrink-0">{renderActions(item)}</div>}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function ListState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'empty',
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  tone?: 'empty' | 'error'
}) {
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Icon className={cn('size-5', tone === 'error' ? 'text-destructive' : 'text-muted-foreground')} aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export interface RowAction {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

// The single ⋯ menu on each row. Its accessible name includes the item, so a
// screen reader's list of buttons isn't twenty identical "Actions".
// Destructive actions sit last, below a separator.
export function RowActionsMenu({
  itemName,
  actions,
  triggerRef: givenTriggerRef,
}: {
  itemName: string
  actions: RowAction[]
  // From useRowDialog, so its dialogs can return focus to this button.
  triggerRef?: RefObject<HTMLButtonElement | null>
}) {
  const ownTriggerRef = useRef<HTMLButtonElement>(null)
  const triggerRef = givenTriggerRef ?? ownTriggerRef
  const safe = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className="size-9 md:size-8"
          aria-label={`Actions for ${itemName}`}
          data-tour="row-menu"
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        {safe.map((action) => (
          <RowActionItem key={action.label} action={action} />
        ))}
        {safe.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((action) => (
          <RowActionItem key={action.label} action={action} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RowActionItem({ action }: { action: RowAction }) {
  const Icon = action.icon
  return (
    <DropdownMenuItem
      variant={action.destructive ? 'destructive' : 'default'}
      disabled={action.disabled}
      onSelect={action.onSelect}
      className="py-2 md:py-1.5"
    >
      {Icon && <Icon aria-hidden="true" />}
      {action.label}
    </DropdownMenuItem>
  )
}
