import { UserRole } from '@prisma/client'
import type { RequestHandler } from 'express'
import { AUTH_COOKIE_NAME, verifyAuthToken } from '../modules/auth/auth.service.js'

export type AuthenticatedRequestUser = {
  userId: string
  role: UserRole
}

export const requireAuth: RequestHandler = (request, response, next) => {
  const token = request.cookies[AUTH_COOKIE_NAME] as string | undefined
  if (!token) {
    response.status(401).json({ error: 'Unauthenticated' })
    return
  }

  try {
    const payload = verifyAuthToken(token)
    if (!payload) {
      response.status(401).json({ error: 'Unauthenticated' })
      return
    }

    response.locals.auth = {
      userId: payload.sub,
      role: payload.role,
    } satisfies AuthenticatedRequestUser
    next()
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')
    ) {
      response.status(401).json({ error: 'Unauthenticated' })
      return
    }
    next(error)
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (_request, response, next) => {
    const auth = response.locals.auth as AuthenticatedRequestUser | undefined

    if (!auth) {
      response.status(401).json({ error: 'Unauthenticated' })
      return
    }

    if (!allowedRoles.includes(auth.role)) {
      response.status(403).json({ error: 'Forbidden' })
      return
    }

    next()
  }
}
