export type EquipmentStatus = 'Available' | 'Faulty' | 'UnderMaintenance' | 'Retired'

export interface ScienceOfficerAssignment {
  userId: number
  email: string
  isPrimary: boolean
}

export interface Equipment {
  id: number
  name: string
  serialNumber: string | null
  description: string | null
  isShared: boolean
  status: EquipmentStatus
  imageUrl: string | null
  iconKey: string | null
  equipmentTypeId: number
  equipmentTypeName: string
  roomId: number
  roomLabel: string
  facilityName: string | null
  owningDepartmentId: number
  owningDepartmentName: string
  scienceOfficers: ScienceOfficerAssignment[]
}
