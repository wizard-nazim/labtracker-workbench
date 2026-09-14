import { createContext, useContext, useState, type ReactNode } from 'react'
import { apiClient } from '@/lib/api-client'
import { authStorage } from '@/lib/auth-storage'
import { decodeJwt } from '@/lib/jwt'
import type { UserRole } from '@/types/roles'

export interface CurrentUser {
  id: number
  email: string
  role: UserRole
}

interface LoginResponse {
  token: string
  email: string
  role: string
}

export type AuthTransition = 'login' | 'logout' | null

interface AuthContextValue {
  user: CurrentUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  transition: AuthTransition
  clearTransition: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function userFromToken(token: string): CurrentUser | null {
  try {
    const decoded = decodeJwt(token)
    if (decoded.exp * 1000 < Date.now()) return null
    return { id: Number(decoded.sub), email: decoded.email, role: decoded.role as UserRole }
  } catch {
    return null
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readInitialUser(): CurrentUser | null {
  const token = authStorage.getToken()
  if (!token) return null

  const restored = userFromToken(token)
  if (!restored) authStorage.clearToken()
  return restored
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(readInitialUser)
  const [transition, setTransition] = useState<AuthTransition>(null)

  async function login(email: string, password: string) {
    const result = await apiClient.post<LoginResponse>('/auth/login', { email, password })
    const decoded = userFromToken(result.token)
    if (!decoded) throw new Error('Received an invalid session token.')
    authStorage.setToken(result.token)
    setUser(decoded)
    if (!prefersReducedMotion()) setTransition('login')
  }

  function logout() {
    authStorage.clearToken()
    setUser(null)
    if (!prefersReducedMotion()) setTransition('logout')
  }

  function clearTransition() {
    setTransition(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, transition, clearTransition }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
