export interface DecodedToken {
  sub: string
  email: string
  role: string
  exp: number
}

// ASP.NET's ClaimTypes.Role is the full claims-XML-namespace URI, not the short
// "role" string, so that's the literal key the backend's JWT payload uses.
const ROLE_CLAIM_KEY = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

export function decodeJwt(token: string): DecodedToken {
  const payload = token.split('.')[1]
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const json = JSON.parse(atob(normalized))

  return {
    sub: json.sub,
    email: json.email,
    role: json[ROLE_CLAIM_KEY] ?? json.role,
    exp: json.exp,
  }
}
