import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { authorizeRoles, requireAuth } from '../../middleware/auth.js'
import {
  createInspectionHandler,
  getInspections,
  getProjectInspections,
  getWorkOrderInspections,
} from './quality.controller.js'

const qualityRouter = Router()

qualityRouter.get('/inspections', requireAuth, getInspections)
qualityRouter.get(
  '/projects/:projectId/inspections',
  requireAuth,
  getProjectInspections,
)
qualityRouter.get(
  '/work-orders/:workOrderId/inspections',
  requireAuth,
  getWorkOrderInspections,
)
qualityRouter.post(
  '/inspections',
  requireAuth,
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.QA),
  createInspectionHandler,
)

export default qualityRouter
