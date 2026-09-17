import type { UserRole } from '@/types/roles'

const ROLE_AVATAR: Record<UserRole, string> = {
  SuperAdmin: '/avatars/super-admin.png',
  ScienceOfficer: '/avatars/science-officer.png',
  PrincipalInvestigator: '/avatars/principal-investigator.png',
  Researcher: '/avatars/researcher.png',
}

// External contacts, and internal actors whose role can't be resolved (a
// Researcher profile with no linked login), fall back to the researcher badge.
export function getRoleAvatarSrc(role: UserRole | null, isExternal: boolean): string {
  if (isExternal) return '/avatars/external.png'
  return role ? ROLE_AVATAR[role] : ROLE_AVATAR.Researcher
}
