import { toast } from 'sonner'
import type { Booking } from './types'

const whenFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// One confirmation for every "book equipment" entry point, so the outcome
// (auto-approved vs. waiting on a Science Officer) and where to go are always
// spelled out the same way.
export function showBookingCreatedToast(booking: Booking) {
  const when = whenFormat.formatRange(new Date(booking.scheduledStart), new Date(booking.scheduledEnd))
  const where = booking.roomLabel.trim() ? `${booking.equipmentName}, ${booking.roomLabel}` : booking.equipmentName

  if (booking.status === 'Approved') {
    toast.success('Booking confirmed', { description: `${where}. ${when}.` })
  } else {
    toast.success('Booking submitted for approval', {
      description: `${where}. ${when}. You'll be notified once a Science Officer decides.`,
    })
  }
}
