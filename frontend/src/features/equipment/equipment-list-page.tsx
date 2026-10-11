import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarCheck, FlaskConical, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ResponsiveList } from '@/components/responsive-list'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { canBookEquipment } from '@/types/roles'
import { BookEquipmentDialog } from '@/features/bookings/book-equipment-dialog'
import { useEquipment } from './use-equipment'
import { StatusIndicator } from './status-indicator'
import { EquipmentAvatar } from './equipment-avatar'
import { CreateEquipmentDialog, EditEquipmentDialog } from './equipment-form-dialog'
import type { Equipment, EquipmentStatus } from './types'

const STATUS_FILTERS: Array<EquipmentStatus | 'All'> = ['All', 'Available', 'Faulty', 'UnderMaintenance', 'Retired']
const STATUS_FILTER_LABEL: Record<EquipmentStatus | 'All', string> = {
  All: 'Any status',
  Available: 'Available',
  Faulty: 'Faulty',
  UnderMaintenance: 'Under maintenance',
  Retired: 'Retired',
}
const ALL_TYPES = 'all'

function initialStatusFrom(searchParams: URLSearchParams): EquipmentStatus | 'All' {
  const value = searchParams.get('status')
  return STATUS_FILTERS.includes(value as EquipmentStatus | 'All') ? (value as EquipmentStatus | 'All') : 'All'
}

function locationLine(item: Equipment) {
  return item.facilityName ? `${item.roomLabel}, ${item.facilityName}` : item.roomLabel
}

function ownerLine(item: Equipment) {
  if (item.researchGroup) return item.researchGroup.name
  if (item.ownershipType === 'Individual' && item.owner) return item.owner.name
  return item.owningDepartmentName
}

export function EquipmentListPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<EquipmentStatus | 'All'>(() => initialStatusFrom(searchParams))
  const [typeId, setTypeId] = useState(ALL_TYPES)
  const { data: equipment, isLoading, isError } = useEquipment(status)
  const { user } = useAuth()
  const canBook = canBookEquipment(user?.role)
  const canManageEquipment = user?.role === 'SuperAdmin' || user?.role === 'PrincipalInvestigator'

  // Types come from what's actually listed, so the filter never offers a
  // type with nothing in it.
  const types = useMemo(() => {
    const byId = new Map<number, string>()
    for (const item of equipment ?? []) byId.set(item.equipmentTypeId, item.equipmentTypeName)
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [equipment])

  const visible = equipment?.filter((item) => typeId === ALL_TYPES || String(item.equipmentTypeId) === typeId)
  const isFiltered = status !== 'All' || typeId !== ALL_TYPES

  function clearFilters() {
    setStatus('All')
    setTypeId(ALL_TYPES)
  }

  function bookButton(item: Equipment, fullWidth = false) {
    if (!canBook || item.status !== 'Available') return null
    return (
      <BookEquipmentDialog
        equipment={item}
        trigger={
          <Button size={fullWidth ? 'lg' : 'sm'} className={fullWidth ? 'w-full' : undefined}>
            <CalendarCheck data-icon="inline-start" aria-hidden="true" />
            Book
            <span className="sr-only"> {item.name}</span>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={FlaskConical}
        title="Equipment"
        description="Find an instrument, see where it is and whether it's free, and book it."
        action={canManageEquipment ? <CreateEquipmentDialog /> : undefined}
      />

      <ResponsiveList
        items={visible}
        isLoading={isLoading}
        isError={isError}
        getKey={(item) => item.id}
        noun="equipment"
        search={{
          label: 'Search equipment',
          placeholder: 'Search by name, room or lab',
          text: (item) =>
            [item.name, item.equipmentTypeName, item.roomLabel, item.facilityName, item.researchGroup?.name, item.serialNumber]
              .filter(Boolean)
              .join(' '),
        }}
        toolbar={
          <>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger className="h-9 w-full sm:w-48" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>All types</SelectItem>
                {types.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as EquipmentStatus | 'All')}>
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_FILTER_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        empty={
          isFiltered
            ? {
                title: 'No equipment matches these filters.',
                description: 'Try another type or status.',
                action: (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ),
              }
            : {
                title: 'No equipment has been added yet.',
                description: canManageEquipment
                  ? 'Add the first instrument so people can find and book it.'
                  : 'Once your department adds instruments, they will show up here.',
                action: canManageEquipment ? <CreateEquipmentDialog /> : undefined,
              }
        }
        columns={[
          {
            key: 'name',
            header: 'Equipment',
            cell: (item) => (
              <Link to={`/equipment/${item.id}`} className="group flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <EquipmentAvatar imageUrl={item.imageUrl} iconKey={item.iconKey} name="" className="size-10 shrink-0" tone="brand" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium text-foreground group-hover:text-primary group-hover:underline">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.equipmentTypeName}</span>
                </span>
              </Link>
            ),
          },
          {
            key: 'where',
            header: 'Where',
            cell: (item) => (
              <span className="flex flex-col">
                <span className="text-foreground">{item.roomLabel}</span>
                {item.facilityName && <span className="text-xs text-muted-foreground">{item.facilityName}</span>}
              </span>
            ),
          },
          {
            key: 'lab',
            header: 'Lab or owner',
            className: 'hidden lg:table-cell',
            cell: (item) => <span className="text-muted-foreground">{ownerLine(item)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            className: 'w-40',
            cell: (item) => <StatusIndicator status={item.status} variant="chip" />,
          },
          ...(canBook || canManageEquipment
            ? [
                {
                  key: 'actions',
                  header: <span className="sr-only">Actions</span>,
                  className: 'w-36 text-right',
                  cell: (item: Equipment) => (
                    <div className="flex items-center justify-end gap-1.5">
                      {bookButton(item)}
                      {canManageEquipment && <EditEquipmentDialog equipment={item} />}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        renderCard={(item) => {
          const book = bookButton(item, true)
          return (
          <div className="flex min-w-0 flex-col gap-3">
            <Link to={`/equipment/${item.id}`} className="flex min-w-0 items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <EquipmentAvatar imageUrl={item.imageUrl} iconKey={item.iconKey} name="" className="size-16 shrink-0" tone="brand" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium leading-snug text-foreground wrap-anywhere">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.equipmentTypeName}</span>
                <span className="flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="mt-px size-3 shrink-0" aria-hidden="true" />
                  <span className="wrap-anywhere">{locationLine(item)}</span>
                </span>
                <StatusIndicator status={item.status} variant="chip" className="mt-0.5 w-fit" />
              </span>
            </Link>
            {(book || canManageEquipment) && (
              <div className="flex items-center gap-2 [&>*]:flex-1 [&>*:first-child]:flex-[2]">
                {book}
                {canManageEquipment && (
                  <EditEquipmentDialog
                    equipment={item}
                    trigger={
                      <Button size="lg" variant="outline" aria-label={`Edit ${item.name}`}>
                        Edit
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </div>
          )
        }}
      />
    </div>
  )
}
