import { cn } from 'cn'
import { EQUIPMENT_STATUS_CONFIG } from './status-config'
import type { EquipmentStatus } from './types'

// "dot" is the quiet inline form used in dense admin tables; "chip" is the
// tinted pill used on the browsing pages, where status is the first thing a
// person scans for.
export function StatusIndicator({
  status,
  variant = 'dot',
  className,
}: {
  status: EquipmentStatus
  variant?: 'dot' | 'chip'
  className?: string
}) {
  const config = EQUIPMENT_STATUS_CONFIG[status]

  if (variant === 'chip') {
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

  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap text-sm', className)}>
      <span className={cn('size-2 shrink-0 rounded-full', config.dotClass)} aria-hidden="true" />
      {config.label}
    </span>
  )
}
