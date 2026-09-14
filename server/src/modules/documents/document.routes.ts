import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { authorizeRoles, requireAuth } from '../../middleware/auth.js'
import {
  createDocumentHandler,
  getDocuments,
  getProjectDocuments,
} from './document.controller.js'

const documentRouter = Router()

documentRouter.get('/', requireAuth, getDocuments)
documentRouter.post(
  '/',
  requireAuth,
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  createDocumentHandler,
)

export default documentRouter

export const projectDocumentRouter = Router()
projectDocumentRouter.get('/:projectId/documents', requireAuth, getProjectDocuments)
