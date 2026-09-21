import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { UserRole } from '../auth/permissions'
import { API_BASE_URL } from '../config/api'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  setUser: (user: AuthUser) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false

  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string'
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()

    async function checkAuthentication() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) {
          setUserState(null)
          setStatus('unauthenticated')
          return
        }

        const data: { user?: unknown } = await response.json()
        if (!isAuthUser(data.user)) {
          setUserState(null)
          setStatus('unauthenticated')
          return
        }

        setUserState(data.user)
        setStatus('authenticated')
      } catch {
        if (!controller.signal.aborted) {
          setUserState(null)
          setStatus('unauthenticated')
        }
      }
    }

    checkAuthentication()
    return () => controller.abort()
  }, [])

  function setUser(nextUser: AuthUser) {
    setUserState(nextUser)
    setStatus('authenticated')
  }

  async function signOut() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setUserState(null)
      setStatus('unauthenticated')
    }
  }

  const value = useMemo(
    () => ({ user, status, setUser, signOut }),
    [status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
