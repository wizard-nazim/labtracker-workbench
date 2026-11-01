import { useState } from 'react'
import type { FieldErrors } from '@/lib/api-error-message'
import type { UpsertEquipmentRequest } from './use-equipment'
import type { Equipment, OwnershipType } from './types'

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
  ownershipType: OwnershipType
  ownerUserId: string
  researchGroupId: string
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
    ownershipType: initial?.ownershipType ?? 'Department',
    ownerUserId: initial?.owner ? String(initial.owner.id) : '',
    researchGroupId: initial?.researchGroup ? String(initial.researchGroup.id) : '',
  }
}

export function useEquipmentFormState(initial?: Equipment) {
  const [state, setState] = useState<EquipmentFormState>(() => buildEquipmentFormState(initial))
  return [state, setState] as const
}

// Fills in what the form shows as already chosen but the user never touched:
// the owning department when there's only one.
export function applyFormDefaults(state: EquipmentFormState, departments: { id: number }[] | undefined): EquipmentFormState {
  if (!state.owningDepartmentId && departments?.length === 1) {
    return { ...state, owningDepartmentId: String(departments[0].id) }
  }
  return state
}

// Client-side checks, keyed by the same PascalCase names the API uses for its
// validation errors so both render through one path.
export function validateEquipmentForm(state: EquipmentFormState): FieldErrors {
  const errors: FieldErrors = {}
  if (!state.name.trim()) errors.Name = ['Enter a name.']
  if (!state.equipmentTypeId) errors.EquipmentTypeId = ['Choose an equipment type.']
  if (!state.roomId) errors.RoomId = ['Choose a room.']
  if (!state.owningDepartmentId) errors.OwningDepartmentId = ['Choose the owning department.']
  if (state.ownershipType === 'Individual' && !state.ownerUserId) errors.OwnerUserId = ['Choose who owns it.']
  return errors
}

export function isEquipmentFormValid(state: EquipmentFormState): boolean {
  return Object.keys(validateEquipmentForm(state)).length === 0
}

export function toEquipmentRequest(state: EquipmentFormState): UpsertEquipmentRequest {
  const isIndividual = state.ownershipType === 'Individual'
  return {
    name: state.name.trim(),
    serialNumber: state.serialNumber.trim() || undefined,
    description: state.description.trim() || undefined,
    isShared: state.isShared,
    imageUrl: state.imageUrl ?? undefined,
    iconKey: state.iconKey ?? undefined,
    equipmentTypeId: Number(state.equipmentTypeId),
    roomId: Number(state.roomId),
    owningDepartmentId: Number(state.owningDepartmentId),
    ownershipType: state.ownershipType,
    ownerUserId: isIndividual && state.ownerUserId ? Number(state.ownerUserId) : null,
    researchGroupId: state.researchGroupId ? Number(state.researchGroupId) : null,
  }
}

// The fields this form renders, so API errors for anything else (which the
// user can't fix by editing a field) are shown as a dialog-level message.
export const EQUIPMENT_FORM_FIELDS = [
  'Name',
  'SerialNumber',
  'Description',
  'EquipmentTypeId',
  'RoomId',
  'OwningDepartmentId',
  'OwnershipType',
  'OwnerUserId',
  'ResearchGroupId',
  'ImageUrl',
  'IconKey',
] as const

export function hasVisibleFieldError(errors: FieldErrors): boolean {
  return EQUIPMENT_FORM_FIELDS.some((field) => (errors[field]?.length ?? 0) > 0)
}
