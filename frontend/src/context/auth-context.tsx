import { createContext, useContext } from 'react'
import type { UserRole } from '@/types/roles'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
}

// TODO(auth phase): replace with a real session check against the LabTracker API.
const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: false })

export function useAuth() {
  return useContext(AuthContext)
}
