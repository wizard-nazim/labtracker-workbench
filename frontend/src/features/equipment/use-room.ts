import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// The parts of a room the equipment page shows. EquipmentDto only carries a
// flattened "Building Floor Room" label, so the detail page fetches the room
// itself to show each part on its own line.
export interface RoomSummary {
  id: number
  building: string
  floor: string
  roomNumber: string
  researchGroupName: string | null
  facilityName: string | null
}

export function useRoom(id: number | undefined) {
  return useQuery({
    queryKey: ['rooms', 'detail', id],
    queryFn: () => apiClient.get<RoomSummary>(`/rooms/${id}`),
    enabled: id !== undefined,
  })
}
