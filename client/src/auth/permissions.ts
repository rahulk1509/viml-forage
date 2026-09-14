import type { AuthUser } from '../context/AuthContext'

export type UserRole =
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'ENGINEER'
  | 'QA'
  | 'SHOP_FLOOR'

export function hasRole(
  user: AuthUser | null,
  role: UserRole,
): boolean {
  return user?.role === role
}

export function hasAnyRole(
  user: AuthUser | null,
  ...roles: UserRole[]
): boolean {
  return user ? roles.includes(user.role as UserRole) : false
}
