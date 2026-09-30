export type UserRole = 'SuperAdmin' | 'ScienceOfficer' | 'Researcher' | 'PrincipalInvestigator'

export const ROLE_LABEL: Record<UserRole, string> = {
  SuperAdmin: 'Super Admin',
  ScienceOfficer: 'Science Officer',
  Researcher: 'Researcher',
  PrincipalInvestigator: 'Principal Investigator',
}

// Everyone except SuperAdmin is, per the client's own framing, "a researcher"
// for booking purposes — SuperAdmin manages the system rather than using it.
export function canBookEquipment(role: UserRole | undefined): boolean {
  return role === 'Researcher' || role === 'PrincipalInvestigator' || role === 'ScienceOfficer'
}
