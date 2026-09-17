import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { UserRole } from '@/types/roles'
import type { FieldOfStudy } from '@/types/field-of-study'

export interface ResearcherProfile {
  id: number
  fullName: string
  studentNumber: string
  fieldOfStudy: FieldOfStudy | null
  researchGroupNames: string[]
}

export interface PrincipalInvestigatorProfile {
  id: number
  fullName: string
  departmentName: string
  hasEquipmentPermissions: boolean
}

export interface Me {
  id: number
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  hasCompletedOnboarding: boolean
  hasCompletedAdminTour: boolean
  researcherProfile: ResearcherProfile | null
  principalInvestigatorProfile: PrincipalInvestigatorProfile | null
}

export const ME_KEY = ['me']

export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: () => apiClient.get<Me>('/auth/me') })
}
