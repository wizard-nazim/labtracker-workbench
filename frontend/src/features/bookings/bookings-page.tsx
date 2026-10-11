import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarClock, Check, Clock, MapPin, X } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ResponsiveList } from '@/components/responsive-list'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { apiErrorMessage } from '@/lib/api-error-message'
import { RecordUsageDialog } from '@/features/usage/record-usage-dialog'
import { BookingStatusIndicator } from './booking-status-indicator'
import { bookingStatusLabel } from './booking-status'
import { useApproveBooking, useBookings, useCancelBooking, useRejectBooking } from './use-bookings'
import { formatWhen } from './format-when'
import type { Booking, BookingStatus } from './types'

const STATUS_FILTERS: Array<BookingStatus | 'All'> = ['All', 'Requested', 'Approved', 'Completed', 'Rejected', 'Cancelled', 'NoShow']

export function BookingsPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'SuperAdmin' || user?.role === 'ScienceOfficer'

  const { data: allBookings, isLoading, isError } = useBookings()
  const [needsMyApproval, setNeedsMyApproval] = useState(false)
  const [status, setStatus] = useState<BookingStatus | 'All'>('All')
  const awaitingMe = allBookings?.filter((b) => b.canApprove) ?? []
  const bookings = (needsMyApproval ? awaitingMe : allBookings)?.filter((b) => status === 'All' || b.status === status)
  const approve = useApproveBooking()
  const reject = useRejectBooking()
  const cancel = useCancelBooking()
  const isPending = approve.isPending || reject.isPending || cancel.isPending

  async function run(action: typeof approve, booking: Booking, doneTitle: string) {
    try {
      await action.mutateAsync(booking.id)
      toast.success(doneTitle, {
        description: `${booking.equipmentName}, ${formatWhen(booking.scheduledStart, booking.scheduledEnd)}.`,
      })
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  function actions(booking: Booking, size: 'sm' | 'lg') {
    const canCancel = booking.status === 'Requested' || booking.status === 'Approved'
    const canRecordUsage = isManager && booking.status === 'Approved'
    if (!booking.canApprove && !canCancel && !canRecordUsage) return null
    const name = `${booking.equipmentName}, ${formatWhen(booking.scheduledStart, booking.scheduledEnd)}`

    return (
      <div className={size === 'lg' ? 'flex flex-wrap gap-2 [&>*]:flex-1' : 'flex items-center justify-end gap-1.5'}>
        {booking.canApprove && (
          <>
            <Button size={size} disabled={isPending} onClick={() => run(approve, booking, 'Booking approved')} aria-label={`Approve ${name}`}>
              <Check data-icon="inline-start" aria-hidden="true" />
              Approve
            </Button>
            <Button
              size={size}
              variant="outline"
              disabled={isPending}
              onClick={() => run(reject, booking, 'Booking rejected')}
              aria-label={`Reject ${name}`}
            >
              <X data-icon="inline-start" aria-hidden="true" />
              Reject
            </Button>
          </>
        )}
        {canRecordUsage && (
          <RecordUsageDialog
            equipmentId={booking.equipmentId}
            equipmentName={booking.equipmentName}
            bookingId={booking.id}
            bookedStart={booking.scheduledStart}
            bookedEnd={booking.scheduledEnd}
            triggerSize={size}
          />
        )}
        {canCancel && (
          <ConfirmDialog
            trigger={
              <Button size={size} variant="ghost" disabled={isPending} aria-label={`Cancel booking: ${name}`}>
                {size === 'lg' ? 'Cancel booking' : 'Cancel'}
              </Button>
            }
            title="Cancel this booking?"
            description={`${name}. The slot becomes free for someone else.`}
            confirmLabel="Cancel booking"
            destructive
            onConfirm={() => run(cancel, booking, 'Booking cancelled')}
          />
        )}
      </div>
    )
  }

  const filtered = needsMyApproval || status !== 'All'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={CalendarClock}
        title="Bookings"
        description={
          isManager
            ? 'Every booking in the department. Approve new requests and record what was used.'
            : 'Your bookings and where each one stands.'
        }
      />

      <ResponsiveList
        items={bookings}
        isLoading={isLoading}
        isError={isError}
        getKey={(booking) => booking.id}
        noun="bookings"
        search={{
          label: 'Search bookings',
          placeholder: isManager ? 'Search by equipment or person' : 'Search by equipment',
          text: (b) => [b.equipmentName, b.actorDisplayName, b.roomLabel, b.notes].filter(Boolean).join(' '),
        }}
        toolbar={
          <>
            <Select value={status} onValueChange={(value) => setStatus(value as BookingStatus | 'All')}>
              <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'All' ? 'Any status' : bookingStatusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isManager && (awaitingMe.length > 0 || needsMyApproval) && (
              <Button
                variant={needsMyApproval ? 'default' : 'outline'}
                className="h-9"
                aria-pressed={needsMyApproval}
                onClick={() => setNeedsMyApproval((v) => !v)}
              >
                <Clock data-icon="inline-start" aria-hidden="true" />
                Needs my approval
                <span
                  className={`ml-0.5 rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                    needsMyApproval ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {awaitingMe.length}
                </span>
              </Button>
            )}
          </>
        }
        empty={
          needsMyApproval && status === 'All'
            ? {
                title: 'Nothing is waiting for your approval.',
                description: 'New requests for equipment you look after will show up here.',
              }
            : filtered
              ? {
                  title: 'No bookings match this filter.',
                  action: (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setStatus('All')
                        setNeedsMyApproval(false)
                      }}
                    >
                      Show all bookings
                    </Button>
                  ),
                }
              : {
                  title: isManager ? 'No bookings yet.' : "You haven't booked anything yet.",
                  description: isManager ? undefined : 'Find an instrument and pick a time that suits you.',
                  action: isManager ? undefined : (
                    <Button size="sm" asChild>
                      <Link to="/equipment">Find equipment</Link>
                    </Button>
                  ),
                }
        }
        columns={[
          {
            key: 'equipment',
            header: 'Equipment',
            cell: (b) => (
              <div className="min-w-0">
                <Link to={`/equipment/${b.equipmentId}`} className="font-medium text-foreground hover:text-primary hover:underline">
                  {b.equipmentName}
                </Link>
                <p className="text-xs text-muted-foreground">{b.roomLabel}</p>
                {b.notes && (
                  <p className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground italic" title={b.notes}>
                    “{b.notes}”
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'when',
            header: 'When',
            cell: (b) => <span className="whitespace-nowrap text-foreground tabular-nums">{formatWhen(b.scheduledStart, b.scheduledEnd)}</span>,
          },
          ...(isManager
            ? [
                {
                  key: 'who',
                  header: 'Booked for',
                  className: 'hidden lg:table-cell',
                  cell: (b: Booking) => <BookedFor booking={b} />,
                },
              ]
            : []),
          { key: 'status', header: 'Status', className: 'w-44', cell: (b) => <BookingStatusIndicator status={b.status} /> },
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            className: 'text-right',
            cell: (b) => actions(b, 'sm'),
          },
        ]}
        renderCard={(b) => {
          const cardActions = actions(b, 'lg')
          return (
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/equipment/${b.equipmentId}`} className="font-medium leading-snug text-foreground wrap-anywhere">
                  {b.equipmentName}
                </Link>
                <BookingStatusIndicator status={b.status} className="shrink-0" />
              </div>
              <p className="flex items-center gap-1.5 text-sm text-foreground tabular-nums">
                <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {formatWhen(b.scheduledStart, b.scheduledEnd)}
              </p>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                <span className="wrap-anywhere">{b.roomLabel}</span>
              </p>
              {isManager && (
                <div className="text-xs">
                  <BookedFor booking={b} />
                </div>
              )}
              {b.notes && <p className="text-xs text-muted-foreground italic wrap-anywhere">“{b.notes}”</p>}
              {cardActions && <div className="mt-1">{cardActions}</div>}
            </div>
          )
        }}
      />
    </div>
  )
}

function BookedFor({ booking }: { booking: Booking }) {
  return (
    <span className="text-muted-foreground">
      <span className="text-foreground">{booking.actorDisplayName}</span>
      {booking.actorType === 'External' && <span className="ml-1 text-xs">(visitor)</span>}
      {booking.actorPhone && (
        <a href={`tel:${booking.actorPhone}`} className="block text-xs text-primary hover:underline">
          {booking.actorPhone}
        </a>
      )}
    </span>
  )
}
