import { Router } from 'express'
import { login, logout, me } from './auth.controller.js'

const authRouter = Router()

authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.get('/me', me)

export default authRouter
