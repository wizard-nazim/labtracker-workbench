import { useState, type ReactNode } from 'react'
import { CalendarCheck, Info, MapPin, TriangleAlert } from 'lucide-react'
import { showBookingCreatedToast } from './booking-toast'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { EquipmentAvatar } from '@/features/equipment/equipment-avatar'
import type { Equipment } from '@/features/equipment/types'
import { useExternalOrganizations } from '@/features/external/use-external'
import type { FieldErrors } from '@/lib/api-error-message'
import { useBookings, useCreateBooking } from './use-bookings'
import { formatWhen } from './format-when'
import { TimeRangeFields } from './time-range-fields'
import { emptyTimeRange, isTimeRangeComplete, resolveTimeRange, type TimeRange } from './time-range'

// Who's allowed to book on behalf of a visiting/external person — keep in sync
// with BookingService.ExternalBookingRoles on the backend.
const EXTERNAL_BOOKING_ROLES = ['SuperAdmin', 'ScienceOfficer', 'PrincipalInvestigator']

const UPCOMING_SHOWN = 4

export function BookEquipmentDialog({ equipment, trigger }: { equipment: Equipment; trigger?: ReactNode }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<TimeRange>(emptyTimeRange)
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({})
  const [bookingFor, setBookingFor] = useState<'self' | 'external'>('self')
  const [externalOrgId, setExternalOrgId] = useState('')
  const [externalContactId, setExternalContactId] = useState('')
  const [notes, setNotes] = useState('')
  const createBooking = useCreateBooking()
  const { data: bookings } = useBookings({ equipmentId: equipment.id })
  const { data: organizations } = useExternalOrganizations()

  const canBookForExternal = user ? EXTERNAL_BOOKING_ROLES.includes(user.role) : false
  const isBookingForExternal = canBookForExternal && bookingFor === 'external'
  const availableContacts = organizations?.find((org) => String(org.id) === externalOrgId)?.contacts ?? []

  const needsAttention = equipment.status === 'Faulty' || equipment.status === 'UnderMaintenance'

  const upcomingBookings = (bookings ?? [])
    .filter((b) => b.status !== 'Cancelled' && b.status !== 'Rejected' && new Date(b.scheduledEnd) >= new Date())
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())

  function reset() {
    setRange(emptyTimeRange())
    setErrors({})
    setBookingFor('self')
    setExternalOrgId('')
    setExternalContactId('')
    setNotes('')
  }

  function handleFieldErrors(fieldErrors: FieldErrors) {
    const start = fieldErrors.ScheduledStart?.[0]
    const end = fieldErrors.ScheduledEnd?.[0]
    setErrors({ start, end })
    return Boolean(start || end)
  }

  async function handleSubmit() {
    setErrors({})
    const { start, end } = resolveTimeRange(range, { start: 'ScheduledStart', end: 'ScheduledEnd' })
    const booking = await createBooking.mutateAsync({
      equipmentId: equipment.id,
      scheduledStart: start,
      scheduledEnd: end,
      externalContactId: isBookingForExternal && externalContactId ? Number(externalContactId) : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    })
    showBookingCreatedToast(booking)
    reset()
  }

  return (
    <EntityDialog
      trigger={
        trigger ?? (
          <Button size="sm" variant="outline">
            <CalendarCheck data-icon="inline-start" aria-hidden="true" />
            Book
          </Button>
        )
      }
      title={`Book ${equipment.name}`}
      description="Pick a day and time. The equipment has to be free for the whole slot."
      submitLabel="Request booking"
      submitDisabled={!isTimeRangeComplete(range) || (isBookingForExternal && !externalContactId)}
      onSubmit={handleSubmit}
      onFieldErrors={handleFieldErrors}
      open={open}
      onOpenChange={(next) => {
        if (!next) setErrors({})
        setOpen(next)
      }}
    >
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-2.5">
        <EquipmentAvatar imageUrl={equipment.imageUrl} iconKey={equipment.iconKey} name="" className="size-10 shrink-0" tone="brand" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{equipment.name}</p>
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {equipment.roomLabel}
              {equipment.facilityName ? `, ${equipment.facilityName}` : ''}
            </span>
          </p>
        </div>
      </div>

      {equipment.description && (
        <div
          className={`flex gap-2.5 rounded-md border p-2.5 ${
            needsAttention ? 'border-status-maintenance/30 bg-status-maintenance/10' : 'border-border'
          }`}
        >
          {needsAttention ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-maintenance" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <p className="text-sm text-muted-foreground">{equipment.description}</p>
        </div>
      )}

      <TimeRangeFields
        idPrefix="booking"
        value={range}
        onChange={(next) => {
          setRange(next)
          if (errors.start || errors.end) setErrors({})
        }}
        startError={errors.start}
        endError={errors.end}
      />

      <div className="rounded-md bg-muted/40 px-3 py-2.5">
        <p className="text-xs font-medium text-foreground">Already booked</p>
        {upcomingBookings.length === 0 ? (
          <p className="mt-0.5 text-sm text-muted-foreground">Nothing booked yet, so any time is free.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground tabular-nums">
            {upcomingBookings.slice(0, UPCOMING_SHOWN).map((booking) => (
              <li key={booking.id} className="wrap-anywhere">
                {formatWhen(booking.scheduledStart, booking.scheduledEnd)}
                {booking.status === 'Requested' && <span className="text-xs"> (waiting for approval)</span>}
              </li>
            ))}
            {upcomingBookings.length > UPCOMING_SHOWN && (
              <li className="text-xs">and {upcomingBookings.length - UPCOMING_SHOWN} more later</li>
            )}
          </ul>
        )}
      </div>

      {canBookForExternal && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="booking-for">Who is it for?</Label>
          <Select value={bookingFor} onValueChange={(v) => setBookingFor(v as 'self' | 'external')}>
            <SelectTrigger id="booking-for" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Me</SelectItem>
              <SelectItem value="external">A visitor from outside UCT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isBookingForExternal && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="booking-external-org">Organisation</Label>
            <Select
              value={externalOrgId}
              onValueChange={(v) => {
                setExternalOrgId(v)
                setExternalContactId('')
              }}
            >
              <SelectTrigger id="booking-external-org" className="w-full">
                <SelectValue placeholder="Choose organisation" />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="booking-external-contact">Visitor</Label>
            <Select value={externalContactId} onValueChange={setExternalContactId} disabled={!externalOrgId}>
              <SelectTrigger id="booking-external-contact" className="w-full">
                <SelectValue placeholder={externalOrgId ? 'Choose visitor' : 'Choose organisation first'} />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.map((contact) => (
                  <SelectItem key={contact.id} value={String(contact.id)}>
                    {contact.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="booking-notes">Notes for the Science Officer (optional)</Label>
        <Textarea
          id="booking-notes"
          placeholder="e.g. course name for a practical, or samples you'll bring"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </div>
    </EntityDialog>
  )
}
