import type { EquipmentStatus } from './types'

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; dotClass: string }> = {
  Available: { label: 'Available', dotClass: 'bg-status-available' },
  Faulty: { label: 'Faulty', dotClass: 'bg-status-faulty' },
  UnderMaintenance: { label: 'Under maintenance', dotClass: 'bg-status-maintenance' },
  Retired: { label: 'Retired', dotClass: 'bg-status-retired' },
}

export function StatusIndicator({ status }: { status: EquipmentStatus }) {
  const config = STATUS_CONFIG[status]

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span className={`size-2 shrink-0 rounded-full ${config.dotClass}`} aria-hidden="true" />
      {config.label}
    </span>
  )
}
