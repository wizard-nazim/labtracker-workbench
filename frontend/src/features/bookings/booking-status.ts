import type { BookingStatus } from './types'

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; chipClass: string; dotClass: string }> = {
  Requested: {
    label: 'Waiting for approval',
    chipClass: 'bg-status-maintenance/15 text-status-maintenance',
    dotClass: 'bg-status-maintenance',
  },
  Approved: { label: 'Approved', chipClass: 'bg-status-available/15 text-status-available', dotClass: 'bg-status-available' },
  Rejected: { label: 'Rejected', chipClass: 'bg-status-faulty/15 text-status-faulty', dotClass: 'bg-status-faulty' },
  Cancelled: { label: 'Cancelled', chipClass: 'bg-status-retired/15 text-status-retired', dotClass: 'bg-status-retired' },
  Completed: { label: 'Completed', chipClass: 'bg-primary/10 text-primary', dotClass: 'bg-primary' },
  NoShow: { label: 'No-show', chipClass: 'bg-status-faulty/15 text-status-faulty', dotClass: 'bg-status-faulty' },
}

export function bookingStatusLabel(status: BookingStatus) {
  return BOOKING_STATUS_CONFIG[status].label
}
