import type { BookingStatus } from './types'

const STATUS_CONFIG: Record<BookingStatus, { label: string; pillClass: string }> = {
  Requested: { label: 'Requested', pillClass: 'bg-status-maintenance/15 text-status-maintenance' },
  Approved: { label: 'Approved', pillClass: 'bg-status-available/15 text-status-available' },
  Rejected: { label: 'Rejected', pillClass: 'bg-status-faulty/15 text-status-faulty' },
  Cancelled: { label: 'Cancelled', pillClass: 'bg-status-retired/15 text-status-retired' },
  Completed: { label: 'Completed', pillClass: 'bg-primary/15 text-primary' },
  NoShow: { label: 'No-show', pillClass: 'bg-status-faulty/15 text-status-faulty' },
}

export function BookingStatusIndicator({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${config.pillClass}`}
    >
      {config.label}
    </span>
  )
}
