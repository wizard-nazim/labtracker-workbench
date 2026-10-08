import { useState } from 'react'
import { showBookingCreatedToast } from './booking-toast'
import { Info, TriangleAlert } from 'lucide-react'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getRoleAvatarSrc } from '@/lib/role-avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { EquipmentAvatar } from '@/features/equipment/equipment-avatar'
import type { Equipment } from '@/features/equipment/types'
import { useExternalOrganizations } from '@/features/external/use-external'
import { useBookings, useCreateBooking } from './use-bookings'
import { BookingStatusIndicator } from './booking-status-indicator'

// Who's allowed to book on behalf of a visiting/external person — keep in sync
// with BookingService.ExternalBookingRoles on the backend.
const EXTERNAL_BOOKING_ROLES = ['SuperAdmin', 'ScienceOfficer', 'PrincipalInvestigator']

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function BookEquipmentDialog({ equipment }: { equipment: Equipment }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
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

  async function handleSubmit() {
    const booking = await createBooking.mutateAsync({
      equipmentId: equipment.id,
      scheduledStart: new Date(start).toISOString(),
      scheduledEnd: new Date(end).toISOString(),
      externalContactId: isBookingForExternal && externalContactId ? Number(externalContactId) : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    })
    showBookingCreatedToast(booking)
    setStart('')
    setEnd('')
    setBookingFor('self')
    setExternalOrgId('')
    setExternalContactId('')
    setNotes('')
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="outline">
          Book
        </Button>
      }
      title={`Book ${equipment.name}`}
      description="Choose a start and end time. The equipment must be free for the whole window."
      submitLabel="Request booking"
      submitDisabled={isBookingForExternal && !externalContactId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="rounded-md border border-border bg-muted/40 p-2.5">
        <div className="flex items-center gap-2.5">
          <EquipmentAvatar imageUrl={equipment.imageUrl} iconKey={equipment.iconKey} name={equipment.name} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{equipment.name}</p>
            <p className="truncate text-xs text-muted-foreground">{equipment.equipmentTypeName}</p>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border pt-2.5">
          <InfoField label="Room" value={equipment.roomLabel} />
          <InfoField label="Department" value={equipment.owningDepartmentName} />
          <InfoField label="Shared" value={equipment.isShared ? 'Yes' : 'No'} />
          <InfoField label="Serial number" value={equipment.serialNumber ?? '—'} />
        </div>

        <div className="mt-2.5 border-t border-border pt-2.5">
          <p className="text-xs font-medium text-foreground">Upcoming bookings</p>
          {upcomingBookings.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No upcoming bookings.</p>
          ) : (
            <ul className="mt-1.5 flex max-h-24 flex-col gap-1.5 overflow-y-auto">
              {upcomingBookings.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={getRoleAvatarSrc(booking.actorRole, booking.actorType === 'External')} alt="" />
                      <AvatarFallback className="text-[10px]">{booking.actorDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
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

      {equipment.description && (
        <div
          className={`flex gap-2.5 rounded-md border p-2.5 ${
            needsAttention ? 'border-status-maintenance/30 bg-status-maintenance/10' : 'border-border bg-muted/40'
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

      {canBookForExternal && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="booking-for">Booking for</Label>
          <Select value={bookingFor} onValueChange={(v) => setBookingFor(v as 'self' | 'external')}>
            <SelectTrigger id="booking-for">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Myself</SelectItem>
              <SelectItem value="external">External visitor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isBookingForExternal && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="booking-external-org">Organization</Label>
            <Select
              value={externalOrgId}
              onValueChange={(v) => {
                setExternalOrgId(v)
                setExternalContactId('')
              }}
            >
              <SelectTrigger id="booking-external-org">
                <SelectValue placeholder="Select an organization" />
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="booking-external-contact">Contact</Label>
            <Select value={externalContactId} onValueChange={setExternalContactId}>
              <SelectTrigger id="booking-external-contact">
                <SelectValue placeholder={externalOrgId ? 'Select a contact' : 'Select an organization first'} />
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
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="booking-start">Start</Label>
        <Input
          id="booking-start"
          type="datetime-local"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="booking-end">End</Label>
        <Input
          id="booking-end"
          type="datetime-local"
          required
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="booking-notes">Notes (optional)</Label>
        <Textarea
          id="booking-notes"
          placeholder="e.g. undergrad course name for practicals"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
        />
      </div>
    </EntityDialog>
  )
}
