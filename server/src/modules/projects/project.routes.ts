import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { authorizeRoles, requireAuth } from '../../middleware/auth.js'
import {
  createProjectHandler,
  getProjectById,
  getProjects,
  updateProjectHandler,
} from './project.controller.js'

const projectRouter = Router()

projectRouter.get('/', requireAuth, getProjects)
projectRouter.post(
  '/',
  requireAuth,
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  createProjectHandler,
)
projectRouter.patch(
  '/:projectId',
  requireAuth,
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  updateProjectHandler,
)
projectRouter.get('/:projectId', requireAuth, getProjectById)

export default projectRouter
