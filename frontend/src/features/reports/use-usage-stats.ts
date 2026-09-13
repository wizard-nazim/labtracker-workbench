import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface UsageStatsRow {
  researchGroupId: number | null
  researchGroupName: string
  principalInvestigatorName: string | null
  sessionCount: number
  totalHours: number
}

export interface UsageStatsFilter {
  equipmentId?: number
  from: string
  to: string
}

export function useUsageStats(filter: UsageStatsFilter) {
  const params = new URLSearchParams({ from: filter.from, to: filter.to })
  if (filter.equipmentId) params.set('equipmentId', String(filter.equipmentId))

  return useQuery({
    queryKey: ['usage-stats', filter],
    queryFn: () => apiClient.get<UsageStatsRow[]>(`/reports/equipment-usage?${params.toString()}`),
  })
}
