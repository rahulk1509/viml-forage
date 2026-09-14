import type { RequestHandler } from 'express'
import {
  AUTH_COOKIE_NAME,
  authenticateUser,
  findUserById,
  getAuthCookieOptions,
  toSafeUser,
  verifyAuthToken,
} from './auth.service.js'

function validateLoginBody(body: unknown): {
  email?: string
  password?: string
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const data = body as Record<string, unknown>
  if (typeof data.email !== 'string' || data.email.trim() === '') {
    return { error: 'email is required' }
  }
  if (typeof data.password !== 'string' || data.password.length === 0) {
    return { error: 'password is required' }
  }

  return {
    email: data.email.trim().toLowerCase(),
    password: data.password,
  }
}

export const login: RequestHandler = async (request, response, next) => {
  const validation = validateLoginBody(request.body)
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  try {
    const result = await authenticateUser(validation.email!, validation.password!)
    if (!result) {
      response.status(401).json({ error: 'Invalid email or password' })
      return
    }

    response.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions())
    response.json({ user: result.user })
  } catch (error) {
    next(error)
  }
}

export const logout: RequestHandler = (_request, response) => {
  response.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions())
  response.json({ message: 'Logged out successfully' })
}

export const me: RequestHandler = async (request, response, next) => {
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

    const user = await findUserById(payload.sub)
    if (!user) {
      response.status(401).json({ error: 'Unauthenticated' })
      return
    }

    response.json({ user: toSafeUser(user) })
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      response.status(401).json({ error: 'Unauthenticated' })
      return
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      response.status(401).json({ error: 'Unauthenticated' })
      return
    }
    next(error)
  }
}
