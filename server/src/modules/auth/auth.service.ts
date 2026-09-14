import bcrypt from 'bcryptjs'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { UserRole } from '@prisma/client'
import prisma from '../../lib/prisma.js'
import { isProductionRuntime } from '../../lib/runtime.js'

export const AUTH_COOKIE_NAME = 'vmil_forge_token'

export type AuthenticatedUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

type AuthTokenPayload = JwtPayload & {
  sub: string
  role: UserRole
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return secret
}

export function getAuthCookieOptions() {
  const isProduction = isProductionRuntime()

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  }
}

export function toSafeUser(user: {
  id: string
  name: string
  email: string
  role: UserRole
}): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: 8 * 60 * 60 },
  )

  return {
    token,
    user: toSafeUser(user),
  }
}

export function verifyAuthToken(token: string) {
  const payload = jwt.verify(token, getJwtSecret())
  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    !Object.values(UserRole).includes(payload.role as UserRole)
  ) {
    return null
  }

  return payload as AuthTokenPayload
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })
}
