export type BookingStatus = 'Requested' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed' | 'NoShow'

export interface Booking {
  id: number
  scheduledStart: string
  scheduledEnd: string
  status: BookingStatus
  equipmentId: number
  equipmentName: string
  researcherId: number | null
  actorDisplayName: string
  createdByUserId: number
  createdAt: string
  approvedByUserId: number | null
  modifiedAt: string | null
}

export interface CreateBookingRequest {
  equipmentId: number
  scheduledStart: string
  scheduledEnd: string
}
