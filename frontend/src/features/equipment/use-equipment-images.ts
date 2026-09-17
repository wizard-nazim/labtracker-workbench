import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface EquipmentImage {
  id: number
  url: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
}

const EQUIPMENT_IMAGES_KEY = ['equipment-images']

export function useEquipmentImages() {
  return useQuery({
    queryKey: EQUIPMENT_IMAGES_KEY,
    queryFn: () => apiClient.get<EquipmentImage[]>('/equipment-images'),
  })
}

export function useUploadEquipmentImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiClient.uploadFile<EquipmentImage>('/equipment-images', file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EQUIPMENT_IMAGES_KEY }),
  })
}

export function useDeleteEquipmentImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<void>(`/equipment-images/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EQUIPMENT_IMAGES_KEY }),
  })
}
