import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Equipment, EquipmentStatus } from './types'

export function useEquipment(status?: EquipmentStatus | 'All') {
  const query = status && status !== 'All' ? `?status=${status}` : ''

  return useQuery({
    queryKey: ['equipment', status ?? 'All'],
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
