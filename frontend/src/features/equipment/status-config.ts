import type { EquipmentStatus } from './types'

export const EQUIPMENT_STATUS_CONFIG: Record<EquipmentStatus, { label: string; dotClass: string; chipClass: string }> = {
  Available: {
    label: 'Available',
    dotClass: 'bg-status-available',
    chipClass: 'bg-status-available/15 text-status-available',
  },
  Faulty: { label: 'Faulty', dotClass: 'bg-status-faulty', chipClass: 'bg-status-faulty/15 text-status-faulty' },
  UnderMaintenance: {
    label: 'Under maintenance',
    dotClass: 'bg-status-maintenance',
    chipClass: 'bg-status-maintenance/15 text-status-maintenance',
  },
  Retired: { label: 'Retired', dotClass: 'bg-status-retired', chipClass: 'bg-status-retired/15 text-status-retired' },
}

export function equipmentStatusLabel(status: EquipmentStatus) {
  return EQUIPMENT_STATUS_CONFIG[status].label
}
