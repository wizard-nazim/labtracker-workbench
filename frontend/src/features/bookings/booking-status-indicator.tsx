import type { BookingStatus } from './types'

const STATUS_CONFIG: Record<BookingStatus, { label: string; dotClass: string }> = {
  Requested: { label: 'Requested', dotClass: 'bg-status-maintenance' },
  Approved: { label: 'Approved', dotClass: 'bg-status-available' },
  Rejected: { label: 'Rejected', dotClass: 'bg-status-faulty' },
  Cancelled: { label: 'Cancelled', dotClass: 'bg-status-retired' },
  Completed: { label: 'Completed', dotClass: 'bg-primary' },
  NoShow: { label: 'No-show', dotClass: 'bg-status-faulty' },
}

export function BookingStatusIndicator({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status]

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span className={`size-2 shrink-0 rounded-full ${config.dotClass}`} aria-hidden="true" />
      {config.label}
    </span>
  )
}
