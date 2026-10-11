import { cn } from 'cn'
import { BOOKING_STATUS_CONFIG } from './booking-status'
import type { BookingStatus } from './types'

export function BookingStatusIndicator({ status, className }: { status: BookingStatus; className?: string }) {
  const config = BOOKING_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.chipClass,
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', config.dotClass)} aria-hidden="true" />
      {config.label}
    </span>
  )
}
