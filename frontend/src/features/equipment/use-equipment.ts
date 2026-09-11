import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Equipment, EquipmentStatus } from './types'

export function useEquipment(status?: EquipmentStatus | 'All') {
  const query = status && status !== 'All' ? `?status=${status}` : ''

  return useQuery({
    queryKey: ['equipment', status ?? 'All'],
    queryFn: () => apiClient.get<Equipment[]>(`/equipment${query}`),
  })
}
