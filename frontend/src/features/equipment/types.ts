export type EquipmentStatus = 'Available' | 'Faulty' | 'UnderMaintenance' | 'Retired'

export type OwnershipType = 'Department' | 'Individual'

export interface EntityReference {
  id: number
  name: string
}

export interface ScienceOfficerAssignment {
  userId: number
  email: string
  name: string | null
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
  ownershipType: OwnershipType
  owner: EntityReference | null
  researchGroup: EntityReference | null
  createdAt: string
  updatedAt: string
  scienceOfficers: ScienceOfficerAssignment[]
}
