import { UserRole } from '@prisma/client'
import { Router } from 'express'
import { authorizeRoles, requireAuth } from '../../middleware/auth.js'
import {
  getProjectWorkOrders,
  getWorkOrders,
  updateWorkOrderHandler,
} from './work-order.controller.js'

const workOrderRouter = Router()

workOrderRouter.get('/work-orders', requireAuth, getWorkOrders)
workOrderRouter.patch(
  '/work-orders/:workOrderId',
  requireAuth,
  authorizeRoles(
    UserRole.ADMIN,
    UserRole.PROJECT_MANAGER,
    UserRole.ENGINEER,
    UserRole.SHOP_FLOOR,
  ),
  updateWorkOrderHandler,
)
workOrderRouter.get(
  '/projects/:projectId/work-orders',
  requireAuth,
  getProjectWorkOrders,
)

export default workOrderRouter
