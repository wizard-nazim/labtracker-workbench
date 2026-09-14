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

export function useUploadEquipmentImage() {
  const queryClient = useQueryClient()
  return useMutation({
    // id is passed per-call (not fixed at hook creation) since the Create dialog
    // only learns the new equipment's id from the create mutation's own result.
    mutationFn: ({ id, file }: { id: number; file: File }) => apiClient.uploadFile<Equipment>(`/equipment/${id}/image`, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  })
}
