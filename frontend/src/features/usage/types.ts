export interface UsageRecord {
  id: number
  actualStart: string
  actualEnd: string
  notes: string | null
  equipmentId: number
  equipmentName: string
  bookingId: number | null
  researcherId: number | null
  actorDisplayName: string
  recordedByUserId: number
  createdAt: string
}

export interface CreateUsageRecordRequest {
  equipmentId: number
  actualStart: string
  actualEnd: string
  notes?: string
  bookingId?: number
  researcherId?: number
}
