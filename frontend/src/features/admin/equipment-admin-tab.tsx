import { useState, type ComponentProps, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableEmptyState } from '@/components/table-empty-state'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { apiErrorMessage } from '@/lib/api-error-message'
import { CreateEquipmentDialog, EditEquipmentDialog } from '@/features/equipment/equipment-form-dialog'
import { StatusIndicator } from '@/features/equipment/status-indicator'
import {
  useArchiveEquipment,
  useDeleteEquipment,
  useEquipment,
  useUnarchiveEquipment,
  type EquipmentSort,
  type SortDirection,
} from '@/features/equipment/use-equipment'
import type { Equipment } from '@/features/equipment/types'
import { AdminSection } from './admin-section'

const COLUMN_COUNT = 8

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// Dates sort newest first on the first click; names A to Z.
const DEFAULT_DIR: Record<EquipmentSort, SortDirection> = { name: 'asc', createdAt: 'desc', updatedAt: 'desc' }

// For narrow screens, where the Created/Updated columns are hidden.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name:asc', label: 'Name, A to Z' },
  { value: 'name:desc', label: 'Name, Z to A' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'updatedAt:asc', label: 'Least recently updated' },
]

export function EquipmentAdminTab() {
  const [sort, setSort] = useState<EquipmentSort>('name')
  const [dir, setDir] = useState<SortDirection>('asc')
  const [includeArchived, setIncludeArchived] = useState(false)
  const { data: equipment, isLoading, isError } = useEquipment('All', { sort, dir, includeArchived })

  function sortBy(column: EquipmentSort) {
    if (column === sort) {
      setDir(dir === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(column)
      setDir(DEFAULT_DIR[column])
    }
  }

  return (
    <AdminSection
      title="Equipment"
      description="Every piece of equipment in one place. Edit it, archive what's no longer in use, or delete entries added by mistake."
      action={<CreateEquipmentDialog />}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-3 py-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-border accent-primary"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Show archived
        </label>
        <div className="flex items-center gap-2 sm:hidden">
          <Label htmlFor="equipment-admin-sort" className="shrink-0">
            Sort by
          </Label>
          <Select
            value={`${sort}:${dir}`}
            onValueChange={(value) => {
              const [nextSort, nextDir] = value.split(':') as [EquipmentSort, SortDirection]
              setSort(nextSort)
              setDir(nextDir)
            }}
          >
            <SelectTrigger id="equipment-admin-sort" size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead column="name" label="Name" sort={sort} dir={dir} onSort={sortBy} />
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden 2xl:table-cell">Location</TableHead>
            <TableHead className="hidden 2xl:table-cell">Owner</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <SortableHead column="createdAt" label="Created" sort={sort} dir={dir} onSort={sortBy} className="hidden sm:table-cell" />
            <SortableHead column="updatedAt" label="Updated" sort={sort} dir={dir} onSort={sortBy} className="hidden md:table-cell" />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={COLUMN_COUNT}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {isError && (
            <TableEmptyState
              colSpan={COLUMN_COUNT}
              tone="error"
              title="Couldn't load equipment."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && equipment?.length === 0 && (
            <TableEmptyState
              colSpan={COLUMN_COUNT}
              title={includeArchived ? 'No equipment yet.' : 'No active equipment.'}
              description={includeArchived ? 'Add equipment to get started.' : 'Turn on Show archived to see archived equipment.'}
            />
          )}

          {equipment?.map((item) => (
            <EquipmentRow key={item.id} item={item} />
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}

function SortableHead({
  column,
  label,
  sort,
  dir,
  onSort,
  className,
}: {
  column: EquipmentSort
  label: string
  sort: EquipmentSort
  dir: SortDirection
  onSort: (column: EquipmentSort) => void
  className?: string
}) {
  const isActive = sort === column
  const Icon = !isActive ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown

  return (
    <TableHead aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {label}
        <Icon className={`size-3.5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} aria-hidden="true" />
      </button>
    </TableHead>
  )
}

function DateCell({ value, className }: { value: string; className?: string }) {
  const date = new Date(value)
  return (
    <TableCell className={`text-muted-foreground ${className ?? ''}`}>
      <time dateTime={value} title={dateTimeFormat.format(date)}>
        {dateFormat.format(date)}
      </time>
    </TableCell>
  )
}

function EquipmentRow({ item }: { item: Equipment }) {
  const isArchived = item.status === 'Retired'
  const owner = item.ownershipType === 'Individual' ? (item.owner?.name ?? 'A person') : item.owningDepartmentName

  return (
    <TableRow>
      <TableCell className="max-w-48 sm:max-w-56">
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span title={item.name} className={`truncate font-medium ${isArchived ? 'text-muted-foreground' : 'text-foreground'}`}>{item.name}</span>
            {isArchived && (
              <Badge variant="outline" className="shrink-0">
                Archived
              </Badge>
            )}
          </span>
          {/* Stands in for the Type/Location/Owner columns where they're hidden. */}
          <span className="truncate text-xs text-muted-foreground 2xl:hidden">
            <span className="md:hidden">{item.equipmentTypeName} · </span>
            {item.roomLabel}
            <span className="hidden sm:inline"> · {owner}</span>
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">{item.equipmentTypeName}</TableCell>
      <TableCell className="hidden text-muted-foreground 2xl:table-cell">{item.roomLabel}</TableCell>
      <TableCell className="hidden text-muted-foreground 2xl:table-cell">{owner}</TableCell>
      <TableCell className="hidden sm:table-cell">
        <StatusIndicator status={item.status} />
      </TableCell>
      <DateCell value={item.createdAt} className="hidden sm:table-cell" />
      <DateCell value={item.updatedAt} className="hidden md:table-cell" />
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <EditEquipmentDialog
            equipment={item}
            trigger={
              <RowActionButton label="Edit" itemName={item.name}>
                <Pencil aria-hidden="true" />
              </RowActionButton>
            }
          />
          {isArchived ? <UnarchiveButton item={item} /> : <ArchiveButton item={item} />}
          <DeleteEquipmentButton item={item} />
        </div>
      </TableCell>
    </TableRow>
  )
}

// Icon-only below the lg breakpoint; the accessible name always includes the
// equipment name so a screen reader's button list isn't ten identical "Edit"s.
function RowActionButton({
  label,
  itemName,
  children,
  destructive = false,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children'> & {
  label: string
  itemName: string
  children: ReactNode
  destructive?: boolean
}) {
  // Rest props carry what a Dialog/AlertDialog trigger (asChild) injects:
  // the click handler, ref and aria-haspopup/expanded state.
  return (
    <Button
      {...props}
      type="button"
      size="sm"
      variant="ghost"
      aria-label={`${label} ${itemName}`}
      title={label}
      className={destructive ? 'text-destructive hover:text-destructive' : undefined}
    >
      {children}
      <span className="hidden lg:inline">{label}</span>
    </Button>
  )
}

function ArchiveButton({ item }: { item: Equipment }) {
  const archive = useArchiveEquipment()

  async function handleArchive() {
    try {
      await archive.mutateAsync(item.id)
      toast.success('Archived')
    } catch (err) {
      toast.error(`Couldn't archive "${item.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <RowActionButton label="Archive" itemName={item.name} disabled={archive.isPending}>
          <Archive aria-hidden="true" />
        </RowActionButton>
      }
      title={`Archive "${item.name}"?`}
      description="It's hidden from the equipment list and can't be booked. Its booking and usage history is kept, and you can unarchive it at any time."
      confirmLabel="Archive"
      onConfirm={handleArchive}
    />
  )
}

function UnarchiveButton({ item }: { item: Equipment }) {
  const unarchive = useUnarchiveEquipment()

  async function handleUnarchive() {
    try {
      await unarchive.mutateAsync(item.id)
      toast.success('Unarchived')
    } catch (err) {
      toast.error(`Couldn't unarchive "${item.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <RowActionButton label="Unarchive" itemName={item.name} disabled={unarchive.isPending} onClick={handleUnarchive}>
      <ArchiveRestore aria-hidden="true" />
    </RowActionButton>
  )
}

function DeleteEquipmentButton({ item }: { item: Equipment }) {
  const remove = useDeleteEquipment()

  async function handleDelete() {
    try {
      await remove.mutateAsync(item.id)
      toast.success('Deleted')
    } catch (err) {
      toast.error(`Couldn't delete "${item.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <RowActionButton label="Delete" itemName={item.name} destructive disabled={remove.isPending}>
          <Trash2 aria-hidden="true" />
        </RowActionButton>
      }
      title={`Delete "${item.name}"?`}
      description="This can't be undone. Equipment with bookings or usage history can't be deleted; archive it instead."
      confirmLabel="Delete equipment"
      destructive
      onConfirm={handleDelete}
    />
  )
}
