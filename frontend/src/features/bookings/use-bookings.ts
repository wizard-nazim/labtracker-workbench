import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Booking, CreateBookingRequest } from './types'

const BOOKINGS_KEY = ['bookings']

export function useBookings(filter?: { equipmentId?: number }) {
  const query = filter?.equipmentId ? `?equipmentId=${filter.equipmentId}` : ''

  return useQuery({
    queryKey: filter?.equipmentId ? [...BOOKINGS_KEY, filter] : BOOKINGS_KEY,
    queryFn: () => apiClient.get<Booking[]>(`/bookings${query}`),
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateBookingRequest) => apiClient.post<Booking>('/bookings', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY }),
  })
}

function useBookingAction(action: 'approve' | 'reject' | 'cancel') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Booking>(`/bookings/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY }),
  })
}

export function useApproveBooking() {
  return useBookingAction('approve')
}

export function useRejectBooking() {
  return useBookingAction('reject')
}

export function useCancelBooking() {
  return useBookingAction('cancel')
}
