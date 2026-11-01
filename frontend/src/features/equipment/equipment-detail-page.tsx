import { createElement, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, Info, Mail, MapPin, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { canBookEquipment } from '@/types/roles'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getRoleAvatarSrc } from '@/lib/role-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { BookEquipmentDialog } from '@/features/bookings/book-equipment-dialog'
import { useBookings } from '@/features/bookings/use-bookings'
import { BookingStatusIndicator } from '@/features/bookings/booking-status-indicator'
import { formatWhen } from '@/features/bookings/format-when'
import { useEquipmentById } from './use-equipment'
import { useRoom, type RoomSummary } from './use-room'
import { StatusIndicator } from './status-indicator'
import { equipmentStatusLabel } from './status-config'
import { EditEquipmentDialog } from './equipment-form-dialog'
import { getEquipmentIcon } from './equipment-icons'
import type { Equipment } from './types'

function floorLabel(floor: string) {
  return /^\d+$/.test(floor.trim()) ? `Floor ${floor.trim()}` : floor
}

// "Molecular Biology Building, Floor 4, Room 4.12" when we have the room's
// parts; the flattened label from the equipment while they load.
function locationText(equipment: Equipment, room: RoomSummary | undefined) {
  if (!room) return equipment.roomLabel
  return [room.building, room.floor && floorLabel(room.floor), room.roomNumber && `Room ${room.roomNumber}`]
    .filter(Boolean)
    .join(', ')
}

function BackLink() {
  return (
    <Link
      to="/equipment"
      className="inline-flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      All equipment
    </Link>
  )
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card p-4 sm:p-5 ${className ?? ''}`}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Facts({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 text-sm lg:grid-cols-1 lg:gap-0.5">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-foreground wrap-anywhere">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EquipmentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const equipmentId = Number(id)

  const { data: equipment, isLoading, isError } = useEquipmentById(equipmentId)
  const { data: room } = useRoom(equipment?.roomId)
  const { data: bookings } = useBookings({ equipmentId })

  const canBook = canBookEquipment(user?.role)
  const canManageEquipment = user?.role === 'SuperAdmin' || user?.role === 'PrincipalInvestigator'

  const upcomingBookings = (bookings ?? [])
    .filter((b) => b.status !== 'Cancelled' && b.status !== 'Rejected' && new Date(b.scheduledEnd) >= new Date())
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError || !equipment) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div role="alert" className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm font-medium text-foreground">Couldn't load this equipment.</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been removed. Go back to the list and pick it again.</p>
        </div>
      </div>
    )
  }

  const needsAttention = equipment.status === 'Faulty' || equipment.status === 'UnderMaintenance'
  const location = locationText(equipment, room)
  const lab = equipment.researchGroup?.name ?? room?.researchGroupName ?? null
  const owner =
    equipment.ownershipType === 'Individual' && equipment.owner ? equipment.owner.name : equipment.owningDepartmentName
  const officers = [...equipment.scienceOfficers].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))

  return (
    <div className="flex flex-col gap-5">
      <BackLink />

      <section className="grid gap-5 rounded-xl border border-border bg-card p-4 sm:p-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-7">
        {equipment.imageUrl ? (
          <img
            src={equipment.imageUrl}
            alt={equipment.name}
            className="aspect-[4/3] max-h-64 w-full rounded-lg border border-border object-cover md:max-h-none"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg bg-accent md:aspect-[4/3] md:h-auto" aria-hidden="true">
            {createElement(getEquipmentIcon(equipment.iconKey), { className: 'size-14 text-accent-foreground/70', strokeWidth: 1.25 })}
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{equipment.equipmentTypeName}</p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground wrap-anywhere sm:text-3xl">
              {equipment.name}
            </h1>
          </div>
          <StatusIndicator status={equipment.status} variant="chip" className="w-fit text-sm" />
          <p className="flex items-start gap-1.5 text-sm text-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              {location}
              {equipment.facilityName && <span className="block text-muted-foreground">{equipment.facilityName}</span>}
            </span>
          </p>

          <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
            {canBook && equipment.status === 'Available' && (
              <BookEquipmentDialog
                equipment={equipment}
                trigger={
                  <Button size="lg" className="h-10 px-4 sm:w-auto">
                    <CalendarCheck data-icon="inline-start" aria-hidden="true" />
                    Book this equipment
                  </Button>
                }
              />
            )}
            {canBook && equipment.status !== 'Available' && (
              <p className="text-sm text-muted-foreground">
                Bookings are paused while it's {equipmentStatusLabel(equipment.status).toLowerCase()}.
              </p>
            )}
            {canManageEquipment && (
              <EditEquipmentDialog
                equipment={equipment}
                trigger={
                  <Button size="lg" variant="outline" className="h-10 px-4">
                    Edit details
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </section>

      {equipment.description && (
        <div
          className={`flex gap-3 rounded-lg border p-4 ${
            needsAttention ? 'border-status-maintenance/30 bg-status-maintenance/10' : 'border-border bg-card'
          }`}
        >
          {needsAttention ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-maintenance" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{needsAttention ? 'Maintenance note' : 'Good to know'}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{equipment.description}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Where to find it">
          <Facts
            items={[
              { label: 'Building', value: room?.building || '—' },
              { label: 'Floor', value: room?.floor ? floorLabel(room.floor) : '—' },
              { label: 'Room', value: room?.roomNumber || equipment.roomLabel },
              { label: 'Facility', value: equipment.facilityName ?? 'Not part of a facility' },
            ]}
          />
        </Section>

        <Section title="Who looks after it">
          <Facts
            items={[
              { label: 'Owned by', value: owner },
              { label: 'Lab', value: lab ?? 'Not linked to a lab' },
              ...(equipment.ownershipType === 'Individual' ? [{ label: 'Department', value: equipment.owningDepartmentName }] : []),
              {
                label: officers.length === 1 ? 'Science officer' : 'Science officers',
                value:
                  officers.length === 0 ? (
                    <span className="text-muted-foreground">None assigned yet</span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {officers.map((officer) => (
                        <li key={officer.userId} className="flex flex-wrap items-center gap-x-1.5">
                          {/* Imported officers keep a placeholder address until an admin sets their real one. */}
                          {officer.email.endsWith('.invalid') ? (
                            <span>{officer.name ?? 'Science officer'}</span>
                          ) : (
                            <a
                              href={`mailto:${officer.email}`}
                              className="inline-flex min-w-0 items-start gap-1 text-primary underline-offset-2 hover:underline"
                            >
                              <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                              <span className="break-all">{officer.name ?? officer.email}</span>
                            </a>
                          )}
                          {officer.isPrimary && officers.length > 1 && (
                            <span className="text-xs text-muted-foreground">(main contact)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ),
              },
            ]}
          />
        </Section>

        <Section title="Details">
          <Facts
            items={[
              { label: 'Type', value: equipment.equipmentTypeName },
              { label: 'Serial number', value: equipment.serialNumber ?? '—' },
              {
                label: 'Shared',
                value: equipment.isShared ? 'Other departments can book it' : 'Only its own department',
              },
            ]}
          />
        </Section>
      </div>

      <Section title="Coming up">
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings coming up. It's free whenever it's available.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {upcomingBookings.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={getRoleAvatarSrc(booking.actorRole, booking.actorType === 'External')} alt="" />
                    <AvatarFallback className="text-xs">{booking.actorDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground tabular-nums">
                      {formatWhen(booking.scheduledStart, booking.scheduledEnd)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{booking.actorDisplayName}</p>
                  </div>
                </div>
                <BookingStatusIndicator status={booking.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
