import { toast } from 'sonner'
import { formatWhen } from './format-when'
import type { Booking } from './types'

// One confirmation for every "book equipment" entry point. The button says
// "Request booking", so the toast says the request went through and what
// happens next (auto-approved vs. waiting on a Science Officer).
export function showBookingCreatedToast(booking: Booking) {
  const when = formatWhen(booking.scheduledStart, booking.scheduledEnd)
  const what = booking.equipmentName

  if (booking.status === 'Approved') {
    toast.success('Booking confirmed', { description: `${what}, ${when}. It's in your bookings.` })
  } else {
    toast.success('Booking requested', {
      description: `${what}, ${when}. We'll notify you when a Science Officer approves it.`,
    })
  }
}
