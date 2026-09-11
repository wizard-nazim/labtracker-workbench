import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CreateUsageRecordRequest, UsageRecord } from './types'

export function useUsageRecords() {
  return useQuery({
    queryKey: ['usage-records'],
    queryFn: () => apiClient.get<UsageRecord[]>('/usage-records'),
  })
}

export function useCreateUsageRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateUsageRecordRequest) => apiClient.post<UsageRecord>('/usage-records', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-records'] })
      // Recording usage against a booking marks that booking Completed.
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
