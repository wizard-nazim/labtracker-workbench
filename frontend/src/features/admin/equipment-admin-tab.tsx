import { useState } from 'react'
import { toast } from 'sonner'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ResponsiveList, RowActionsMenu, type ListColumn } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { apiErrorMessage } from '@/lib/api-error-message'
import { CreateEquipmentDialog, EditEquipmentDialog } from '@/features/equipment/equipment-form-dialog'
import { EquipmentAvatar } from '@/features/equipment/equipment-avatar'
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
import { AddButton, AdminSection } from './admin-section'
import { useEquipmentTypes } from './equipment-types'

const ALL_TYPES = 'all'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// Dates sort newest first on the first click; names A to Z.
const DEFAULT_DIR: Record<EquipmentSort, SortDirection> = { name: 'asc', createdAt: 'desc', updatedAt: 'desc' }

// For phones, where there are no column headers to click.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name:asc', label: 'Name, A to Z' },
  { value: 'name:desc', label: 'Name, Z to A' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'updatedAt:asc', label: 'Least recently updated' },
]

export function EquipmentAdminTab({
  typeId,
  onTypeChange,
}: {
  // The type to show, as a string id, or null for every type.
  typeId: string | null
  onTypeChange: (typeId: string | null) => void
}) {
  const [sort, setSort] = useState<EquipmentSort>('name')
  const [dir, setDir] = useState<SortDirection>('asc')
  const [includeArchived, setIncludeArchived] = useState(false)
  const { data: equipment, isLoading, isError } = useEquipment('All', { sort, dir, includeArchived })
  const { data: types } = useEquipmentTypes()
  const typeName = types?.find((t) => String(t.id) === typeId)?.name
  const items = typeId ? equipment?.filter((e) => String(e.equipmentTypeId) === typeId) : equipment

  function sortBy(column: EquipmentSort) {
    if (column === sort) {
      setDir(dir === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(column)
      setDir(DEFAULT_DIR[column])
    }
  }

  function sortableColumn(column: EquipmentSort, label: string, className?: string): Pick<ListColumn<Equipment>, 'header' | 'headProps' | 'className'> {
    const isActive = sort === column
    const Icon = !isActive ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
    return {
      className,
      headProps: { 'aria-sort': isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none' },
      header: (
        <button
          type="button"
          onClick={() => sortBy(column)}
          className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {label}
          <Icon className={`size-3.5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} aria-hidden="true" />
        </button>
      ),
    }
  }

  const empty = typeId
    ? {
        title: `No ${includeArchived ? '' : 'active '}equipment of type ${typeName ?? 'this type'}.`,
        description: 'Add equipment of this type, or show all types.',
        action: (
          <Button size="sm" variant="outline" onClick={() => onTypeChange(null)}>
            Show all types
          </Button>
        ),
      }
    : includeArchived
      ? { title: 'No equipment yet.', description: 'Add the first item. You can create its type and room as you go.' }
      : {
          title: 'No active equipment.',
          description: 'Add the first item, or turn on Show archived to see archived equipment.',
        }

  return (
    <AdminSection
      title="Items"
      description="Every piece of equipment. Edit it, archive what's no longer used, or delete entries added by mistake."
      action={<CreateEquipmentDialog trigger={<AddButton>Add equipment</AddButton>} />}
    >
      <ResponsiveList
        items={items}
        isLoading={isLoading}
        isError={isError}
        noun="equipment"
        getKey={(item) => item.id}
        search={{
          label: 'Search equipment',
          placeholder: 'Search by name, serial number or room',
          text: (item) => `${item.name} ${item.serialNumber ?? ''} ${item.roomLabel} ${item.equipmentTypeName}`,
        }}
        toolbar={
          <>
            <Select value={typeId ?? ALL_TYPES} onValueChange={(v) => onTypeChange(v === ALL_TYPES ? null : v)}>
              <SelectTrigger className="h-9 w-full sm:w-48" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All types</SelectItem>
                {types?.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={`${sort}:${dir}`}
              onValueChange={(value) => {
                const [nextSort, nextDir] = value.split(':') as [EquipmentSort, SortDirection]
                setSort(nextSort)
                setDir(nextDir)
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-48 md:hidden" aria-label="Sort by">
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
            <label className="flex h-9 items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              Show archived
            </label>
            {typeId && typeName && (
              <Button size="sm" variant="ghost" className="self-start sm:self-auto" onClick={() => onTypeChange(null)}>
                <X aria-hidden="true" />
                Clear type filter
              </Button>
            )}
          </>
        }
        empty={empty}
        columns={[
          { key: 'name', ...sortableColumn('name', 'Name'), cell: (item) => <NameCell item={item} /> },
          { key: 'type', header: 'Type', cell: (item) => <span className="text-muted-foreground">{item.equipmentTypeName}</span> },
          {
            key: 'room',
            header: 'Room',
            className: 'hidden lg:table-cell',
            cell: (item) => <span className="text-muted-foreground">{item.roomLabel}</span>,
          },
          {
            key: 'owner',
            header: 'Owner',
            className: 'hidden 2xl:table-cell',
            cell: (item) => <span className="text-muted-foreground">{ownerLabel(item)}</span>,
          },
          { key: 'status', header: 'Status', cell: (item) => <StatusIndicator status={item.status} /> },
          {
            key: 'createdAt',
            ...sortableColumn('createdAt', 'Added', 'hidden 2xl:table-cell'),
            cell: (item) => <DateText value={item.createdAt} />,
          },
          {
            key: 'updatedAt',
            ...sortableColumn('updatedAt', 'Updated'),
            cell: (item) => <DateText value={item.updatedAt} />,
          },
        ]}
        renderCard={(item) => (
          <div className="flex min-w-0 items-start gap-3">
            <EquipmentAvatar imageUrl={item.imageUrl} iconKey={item.iconKey} name="" className="size-10 shrink-0" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`font-medium wrap-anywhere ${item.status === 'Retired' ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {item.name}
                </span>
                {item.status === 'Retired' && <Badge variant="outline">Archived</Badge>}
              </p>
              <p className="text-[13px] text-muted-foreground wrap-anywhere">
                {item.equipmentTypeName}, {item.roomLabel}
              </p>
              {item.status !== 'Retired' && (
                <div className="text-[13px]">
                  <StatusIndicator status={item.status} />
                </div>
              )}
            </div>
          </div>
        )}
        renderActions={(item) => <EquipmentActions item={item} />}
        rowClassName={(item) => (item.status === 'Retired' ? 'bg-muted/30' : undefined)}
      />
    </AdminSection>
  )
}

function ownerLabel(item: Equipment) {
  return item.ownershipType === 'Individual' ? (item.owner?.name ?? 'A person') : item.owningDepartmentName
}

function NameCell({ item }: { item: Equipment }) {
  const isArchived = item.status === 'Retired'
  return (
    <div className="flex min-w-0 items-center gap-3">
      <EquipmentAvatar imageUrl={item.imageUrl} iconKey={item.iconKey} name="" className="size-8 shrink-0" />
      <span className="flex min-w-0 items-center gap-2">
        <span title={item.name} className={`max-w-64 truncate font-medium ${isArchived ? 'text-muted-foreground' : 'text-foreground'}`}>
          {item.name}
        </span>
        {isArchived && (
          <Badge variant="outline" className="shrink-0">
            Archived
          </Badge>
        )}
      </span>
    </div>
  )
}

function DateText({ value }: { value: string }) {
  const date = new Date(value)
  return (
    <time dateTime={value} title={dateTimeFormat.format(date)} className="whitespace-nowrap text-muted-foreground">
      {dateFormat.format(date)}
    </time>
  )
}

function EquipmentActions({ item }: { item: Equipment }) {
  const dialog = useRowDialog<'edit' | 'archive' | 'delete'>()
  const unarchive = useUnarchiveEquipment()
  const isArchived = item.status === 'Retired'

  async function handleUnarchive() {
    try {
      await unarchive.mutateAsync(item.id)
      toast.success(`Unarchived "${item.name}".`)
    } catch (err) {
      toast.error(`Couldn't unarchive "${item.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef}
        itemName={item.name}
        actions={[
          { label: 'Edit', icon: Pencil, onSelect: () => dialog.show('edit') },
          isArchived
            ? { label: 'Unarchive', icon: ArchiveRestore, onSelect: handleUnarchive, disabled: unarchive.isPending }
            : { label: 'Archive', icon: Archive, onSelect: () => dialog.show('archive') },
          { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => dialog.show('delete') },
        ]}
      />
      {dialog.mounted === 'edit' && <EditEquipmentDialog key={dialog.session} equipment={item} {...dialog.bind('edit')} />}
      <ArchiveDialog item={item} {...dialog.bind('archive')} />
      <DeleteEquipmentDialog item={item} {...dialog.bind('delete')} />
    </>
  )
}

interface ControlledProps {
  item: Equipment
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ArchiveDialog({ item, open, onOpenChange }: ControlledProps) {
  const archive = useArchiveEquipment()

  async function handleArchive() {
    try {
      await archive.mutateAsync(item.id)
      toast.success(`Archived "${item.name}".`)
    } catch (err) {
      toast.error(`Couldn't archive "${item.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Archive "${item.name}"?`}
      description="It's hidden from the equipment list and can't be booked. Its booking and usage history is kept, and you can unarchive it at any time."
      confirmLabel="Archive"
      onConfirm={handleArchive}
    />
  )
}

function DeleteEquipmentDialog({ item, open, onOpenChange }: ControlledProps) {
  const remove = useDeleteEquipment()

  async function handleDelete() {
    try {
      await remove.mutateAsync(item.id)
      toast.success(`Deleted "${item.name}".`)
    } catch (err) {
      toast.error(`Couldn't delete "${item.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete "${item.name}"?`}
      description="This can't be undone. Equipment with bookings or usage history can't be deleted; archive it instead."
      confirmLabel="Delete equipment"
      destructive
      onConfirm={handleDelete}
    />
  )
}
