import type { UserRole } from '@/types/roles'

export type BookingStatus = 'Requested' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed' | 'NoShow'
export type BookingActorType = 'Internal' | 'External'

export interface Booking {
  id: number
  scheduledStart: string
  scheduledEnd: string
  status: BookingStatus
  equipmentId: number
  equipmentName: string
  roomLabel: string
  actorType: BookingActorType
  researcherId: number | null
  externalContactId: number | null
  actorDisplayName: string
  actorRole: UserRole | null
  // Only sent to Super Admins and Science Officers.
  actorPhone: string | null
  notes: string | null
  createdByUserId: number
  createdAt: string
  approvedByUserId: number | null
  modifiedAt: string | null
  // True when the signed-in user may approve/reject this booking right now.
  canApprove: boolean
}

export interface CreateBookingRequest {
  equipmentId: number
  scheduledStart: string
  scheduledEnd: string
  researcherId?: number
  externalContactId?: number
  notes?: string
}
