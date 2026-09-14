import { toast } from 'sonner'
import { CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { PageBanner } from '@/components/page-banner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TableEmptyState } from '@/components/table-empty-state'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/api-client'
import { RecordUsageDialog } from '@/features/usage/record-usage-dialog'
import { BookingStatusIndicator } from './booking-status-indicator'
import { useApproveBooking, useBookings, useCancelBooking, useRejectBooking } from './use-bookings'
import type { Booking } from './types'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Try again.'
}

export function BookingsPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'SuperAdmin' || user?.role === 'ScienceOfficer'

  const { data: bookings, isLoading, isError } = useBookings()
  const approve = useApproveBooking()
  const reject = useRejectBooking()
  const cancel = useCancelBooking()

  async function handleApprove(booking: Booking) {
    try {
      await approve.mutateAsync(booking.id)
      toast.success(`Approved booking for ${booking.equipmentName}.`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function handleReject(booking: Booking) {
    try {
      await reject.mutateAsync(booking.id)
      toast.success(`Rejected booking for ${booking.equipmentName}.`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function handleCancel(booking: Booking) {
    try {
      await cancel.mutateAsync(booking.id)
      toast.success(`Cancelled booking for ${booking.equipmentName}.`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const columnCount = (isManager ? 6 : 5) + 1

  return (
    <div className="flex flex-col gap-6">
      <PageBanner />

      <PageHeader
        icon={CalendarClock}
        title="Bookings"
        description={isManager ? 'All equipment bookings across the department.' : 'Your equipment bookings.'}
      />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Status</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead className="hidden lg:table-cell">Room</TableHead>
              {isManager && <TableHead className="hidden md:table-cell">Booked for</TableHead>}
              <TableHead>Start</TableHead>
              <TableHead className="hidden sm:table-cell">End</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columnCount}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableEmptyState
                colSpan={columnCount}
                tone="error"
                title="Couldn't load bookings."
                description="Check that the API is running and try again."
              />
            )}

            {!isLoading && !isError && bookings?.length === 0 && (
              <TableEmptyState
                colSpan={columnCount}
                title={isManager ? 'No bookings yet.' : "You haven't booked any equipment yet."}
              />
            )}

            {bookings?.map((booking) => {
              const isPending = approve.isPending || reject.isPending || cancel.isPending
              const canCancel = booking.status === 'Requested' || booking.status === 'Approved'

              return (
                <TableRow key={booking.id}>
                  <TableCell>
                    <BookingStatusIndicator status={booking.status} />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{booking.equipmentName}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{booking.roomLabel}</TableCell>
                  {isManager && (
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {booking.actorDisplayName}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">{formatDateTime(booking.scheduledStart)}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDateTime(booking.scheduledEnd)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {isManager && booking.status === 'Requested' && (
                        <>
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleApprove(booking)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReject(booking)}>
                            Reject
                          </Button>
                        </>
                      )}
                      {isManager && booking.status === 'Approved' && (
                        <RecordUsageDialog
                          equipmentId={booking.equipmentId}
                          equipmentName={booking.equipmentName}
                          bookingId={booking.id}
                        />
                      )}
                      {canCancel && (
                        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleCancel(booking)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
