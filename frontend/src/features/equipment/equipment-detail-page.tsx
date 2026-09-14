import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Info, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useBookings, useCreateBooking } from '@/features/bookings/use-bookings'
import { BookingStatusIndicator } from '@/features/bookings/booking-status-indicator'
import { useEquipmentById } from './use-equipment'
import { EquipmentAvatar } from './equipment-avatar'
import { StatusIndicator } from './status-indicator'
import { EditEquipmentDialog } from './equipment-form-dialog'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export function EquipmentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const equipmentId = Number(id)

  const { data: equipment, isLoading, isError } = useEquipmentById(equipmentId)
  const { data: bookings } = useBookings({ equipmentId })
  const createBooking = useCreateBooking()

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const canBook = user?.role === 'Researcher'
  const isSuperAdmin = user?.role === 'SuperAdmin'

  async function handleBook() {
    if (!equipment) return
    try {
      await createBooking.mutateAsync({
        equipmentId: equipment.id,
        scheduledStart: new Date(start).toISOString(),
        scheduledEnd: new Date(end).toISOString(),
      })
      toast.success(`Booking requested for ${equipment.name}.`)
      setStart('')
      setEnd('')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const upcomingBookings = (bookings ?? [])
    .filter((b) => b.status !== 'Cancelled' && b.status !== 'Rejected' && new Date(b.scheduledEnd) >= new Date())
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-md" />
      </div>
    )
  }

  if (isError || !equipment) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/equipment" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Equipment
        </Link>
        <p className="text-sm text-muted-foreground">Couldn't load this equipment item.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/equipment" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Equipment
      </Link>

      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <EquipmentAvatar imageUrl={equipment.imageUrl} iconKey={equipment.iconKey} name={equipment.name} className="size-16" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{equipment.name}</h1>
              <div className="mt-1 flex items-center gap-3">
                <StatusIndicator status={equipment.status} />
                <span className="text-sm text-muted-foreground">{equipment.equipmentTypeName}</span>
              </div>
            </div>
          </div>
          {isSuperAdmin && <EditEquipmentDialog equipment={equipment} />}
        </div>

        {equipment.description && (
          <div
            className={`mt-4 flex gap-3 rounded-md border p-3.5 ${
              equipment.status === 'Faulty' || equipment.status === 'UnderMaintenance'
                ? 'border-status-maintenance/30 bg-status-maintenance/10'
                : 'border-border bg-muted/40'
            }`}
          >
            {equipment.status === 'Faulty' || equipment.status === 'UnderMaintenance' ? (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-maintenance" aria-hidden="true" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div>
              <p className="text-xs font-medium text-foreground">
                {equipment.status === 'Faulty' || equipment.status === 'UnderMaintenance' ? 'Maintenance note' : 'Note from admin'}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{equipment.description}</p>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoField label="Room" value={equipment.roomLabel} />
          <InfoField label="Department" value={equipment.owningDepartmentName} />
          <InfoField label="Serial number" value={equipment.serialNumber ?? '—'} />
          <InfoField label="Shared" value={equipment.isShared ? 'Yes' : 'No'} />
        </div>
      </div>

      {canBook && equipment.status === 'Available' && (
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-foreground">Book this equipment</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a start and end time. It must be free for the whole window.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-booking-start">Start</Label>
              <Input id="detail-booking-start" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-booking-end">End</Label>
              <Input id="detail-booking-end" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button disabled={!start || !end || createBooking.isPending} onClick={handleBook}>
              {createBooking.isPending ? 'Requesting…' : 'Request booking'}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-foreground">Upcoming bookings</h2>
        {upcomingBookings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {upcomingBookings.map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback className="text-xs">{booking.actorDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{booking.actorDisplayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(booking.scheduledStart)} – {formatDateTime(booking.scheduledEnd)}
                    </p>
                  </div>
                </div>
                <BookingStatusIndicator status={booking.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
