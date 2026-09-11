import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface Researcher {
  id: number
  fullName: string
  studentNumber: string
  researchGroupId: number
  researchGroupName: string
  userId: number | null
  userEmail: string | null
}

export function useResearchers() {
  return useQuery({
    queryKey: ['researchers'],
    queryFn: () => apiClient.get<Researcher[]>('/researchers'),
  })
}
