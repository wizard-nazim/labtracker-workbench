export type UserRole = 'SuperAdmin' | 'ScienceOfficer' | 'Researcher' | 'PrincipalInvestigator'

// Everyone except SuperAdmin is, per the client's own framing, "a researcher"
// for booking purposes — SuperAdmin manages the system rather than using it.
export function canBookEquipment(role: UserRole | undefined): boolean {
  return role === 'Researcher' || role === 'PrincipalInvestigator' || role === 'ScienceOfficer'
}
