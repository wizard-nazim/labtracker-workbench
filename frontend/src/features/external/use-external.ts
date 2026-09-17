import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ExternalOrganization } from './types'

export function useExternalOrganizations() {
  return useQuery({ queryKey: ['external'], queryFn: () => apiClient.get<ExternalOrganization[]>('/external') })
}
