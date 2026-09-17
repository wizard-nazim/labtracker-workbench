import { useState } from 'react'
import type { Equipment } from './types'

export interface EquipmentFormState {
  name: string
  serialNumber: string
  description: string
  equipmentTypeId: string
  roomId: string
  owningDepartmentId: string
  isShared: boolean
  iconKey: string | null
  imageUrl: string | null
}

export function buildEquipmentFormState(initial?: Equipment): EquipmentFormState {
  return {
    name: initial?.name ?? '',
    serialNumber: initial?.serialNumber ?? '',
    description: initial?.description ?? '',
    equipmentTypeId: initial ? String(initial.equipmentTypeId) : '',
    roomId: initial ? String(initial.roomId) : '',
    owningDepartmentId: initial ? String(initial.owningDepartmentId) : '',
    isShared: initial?.isShared ?? false,
    iconKey: initial?.iconKey ?? null,
    imageUrl: initial?.imageUrl ?? null,
  }
}

export function useEquipmentFormState(initial?: Equipment) {
  const [state, setState] = useState<EquipmentFormState>(() => buildEquipmentFormState(initial))
  return [state, setState] as const
}

export function toEquipmentRequest(state: EquipmentFormState) {
  return {
    name: state.name,
    serialNumber: state.serialNumber || undefined,
    description: state.description || undefined,
    isShared: state.isShared,
    imageUrl: state.imageUrl ?? undefined,
    iconKey: state.iconKey ?? undefined,
    equipmentTypeId: Number(state.equipmentTypeId),
    roomId: Number(state.roomId),
    owningDepartmentId: Number(state.owningDepartmentId),
  }
}
