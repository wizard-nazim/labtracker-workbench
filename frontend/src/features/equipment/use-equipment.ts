import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Equipment, EquipmentStatus, OwnershipType } from './types'

export type EquipmentSort = 'name' | 'createdAt' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

export interface EquipmentListOptions {
  // Archived (Retired) equipment is hidden by the API unless asked for.
  includeArchived?: boolean
  sort?: EquipmentSort
  dir?: SortDirection
}

export function useEquipment(status?: EquipmentStatus | 'All', options: EquipmentListOptions = {}) {
  const { includeArchived = false, sort = 'name', dir = 'asc' } = options
  const params = new URLSearchParams()
  if (status && status !== 'All') params.set('status', status)
  if (includeArchived) params.set('includeArchived', 'true')
  if (sort !== 'name') params.set('sort', sort)
  if (dir !== 'asc') params.set('dir', dir)
  const queryString = params.toString()
  const query = queryString ? `?${queryString}` : ''

  return useQuery({
    queryKey: ['equipment', status ?? 'All', { includeArchived, sort, dir }],
    queryFn: () => apiClient.get<Equipment[]>(`/equipment${query}`),
  })
}

export function useEquipmentById(id: number) {
  return useQuery({
    queryKey: ['equipment', 'detail', id],
    queryFn: () => apiClient.get<Equipment>(`/equipment/${id}`),
  })
}

export interface UpsertEquipmentRequest {
  name: string
  serialNumber?: string
  description?: string
  isShared: boolean
  imageUrl?: string
  iconKey?: string
  equipmentTypeId: number
  roomId: number
  owningDepartmentId: number
  // PUT is a full replace, so these are always sent.
  ownershipType: OwnershipType
  ownerUserId: number | null
  researchGroupId: number | null
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertEquipmentRequest) => apiClient.post<Equipment>('/equipment', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}

export function useUpdateEquipment(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertEquipmentRequest) => apiClient.put<Equipment>(`/equipment/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}

export function useUpdateEquipmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: EquipmentStatus }) =>
      apiClient.patch<Equipment>(`/equipment/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}

export function useAssignScienceOfficer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ equipmentId, userId, isPrimary }: { equipmentId: number; userId: number; isPrimary: boolean }) =>
      apiClient.post<Equipment>(`/equipment/${equipmentId}/science-officers`, { userId, isPrimary }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}

export function useRemoveScienceOfficer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ equipmentId, userId }: { equipmentId: number; userId: number }) =>
      apiClient.delete<void>(`/equipment/${equipmentId}/science-officers/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}

export function useArchiveEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Equipment>(`/equipment/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}

export function useUnarchiveEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Equipment>(`/equipment/${id}/unarchive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<void>(`/equipment/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}
