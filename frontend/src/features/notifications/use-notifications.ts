import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type NotificationType = 'EquipmentUpdated' | 'BookingApproved' | 'BookingRejected'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body: string
  equipmentId: number | null
  bookingId: number | null
  createdAt: string
  readAt: string | null
}

const NOTIFICATIONS_KEY = ['notifications']

// Polled rather than pushed: a minute's delay is fine for "equipment is down"
// news, and it keeps the backend free of websockets.
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => apiClient.get<AppNotification[]>('/notifications'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.post<void>(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<void>('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}
