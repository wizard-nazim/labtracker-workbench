import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { AUTH_EXPIRED_EVENT, apiClient } from '@/lib/api-client'
import { authStorage } from '@/lib/auth-storage'
import { decodeJwt } from '@/lib/jwt'
import { queryClient } from '@/lib/query-client'
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
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
  transition: AuthTransition
  clearTransition: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// setTimeout overflows past ~24.8 days; tokens live hours, but stay safe.
const MAX_TIMER_MS = 2_147_483_647

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

  // Ends the session when the token runs out (timer) or the API rejects it
  // (AUTH_EXPIRED_EVENT from api-client). ProtectedRoute then sends the user to
  // /login and brings them back to the same page after signing in again.
  useEffect(() => {
    if (!user) return

    function expireSession() {
      authStorage.clearToken()
      queryClient.clear()
      setUser(null)
      toast('Your session has expired. Please sign in again.', { id: 'session-expired' })
    }

    const token = authStorage.getToken()
    const expiresInMs = token ? decodeJwt(token).exp * 1000 - Date.now() : 0
    const timer = window.setTimeout(expireSession, Math.min(Math.max(expiresInMs, 0), MAX_TIMER_MS))

    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession)
    }
  }, [user])

  function startSession(token: string) {
    const decoded = userFromToken(token)
    if (!decoded) throw new Error('Received an invalid session token.')
    authStorage.setToken(token)
    setUser(decoded)
    if (!prefersReducedMotion()) setTransition('login')
  }

  async function login(email: string, password: string) {
    const result = await apiClient.post<LoginResponse>('/auth/login', { email, password })
    startSession(result.token)
  }

  async function loginWithGoogle(credential: string) {
    const result = await apiClient.post<LoginResponse>('/auth/google', { credential })
    startSession(result.token)
  }

  function logout() {
    authStorage.clearToken()
    // Drop the previous user's cached data so the next sign-in starts clean.
    queryClient.clear()
    setUser(null)
    if (!prefersReducedMotion()) setTransition('logout')
  }

  function clearTransition() {
    setTransition(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, transition, clearTransition }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
