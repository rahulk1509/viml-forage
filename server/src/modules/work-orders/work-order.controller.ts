import { WorkOrderStatus } from '@prisma/client'
import type { RequestHandler } from 'express'
import {
  findWorkOrders,
  findWorkOrdersByProjectId,
  updateWorkOrder,
  type UpdateWorkOrderInput,
} from './work-order.service.js'

export const getWorkOrders: RequestHandler = async (_request, response, next) => {
  try {
    const workOrders = await findWorkOrders()
    response.json(workOrders)
  } catch (error) {
    next(error)
  }
}

export const getProjectWorkOrders: RequestHandler<{
  projectId: string
}> = async (request, response, next) => {
  try {
    const project = await findWorkOrdersByProjectId(request.params.projectId)

    if (!project) {
      response.status(404).json({
        error: 'Project not found',
        projectId: request.params.projectId,
      })
      return
    }

    response.json(project.workOrders)
  } catch (error) {
    next(error)
  }
}

function isWorkOrderStatus(value: unknown): value is WorkOrderStatus {
  return (
    typeof value === 'string' &&
    Object.values(WorkOrderStatus).includes(value as WorkOrderStatus)
  )
}

function validateUpdateWorkOrderInput(body: unknown): {
  input?: UpdateWorkOrderInput
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const data = body as Record<string, unknown>
  const allowedFields = ['status', 'progress'] as const
  const providedFields = allowedFields.filter((field) => field in data)

  if (providedFields.length === 0) {
    return { error: 'At least one work order field is required for update' }
  }

  if ('status' in data && !isWorkOrderStatus(data.status)) {
    return { error: 'status must be a valid work order status' }
  }

  if (
    'progress' in data &&
    (typeof data.progress !== 'number' ||
      !Number.isInteger(data.progress) ||
      data.progress < 0 ||
      data.progress > 100)
  ) {
    return { error: 'progress must be an integer between 0 and 100' }
  }

  const input: UpdateWorkOrderInput = {}
  if ('status' in data) input.status = data.status as WorkOrderStatus
  if ('progress' in data) input.progress = data.progress as number

  return { input }
}

export const updateWorkOrderHandler: RequestHandler<{
  workOrderId: string
}> = async (request, response, next) => {
  const validation = validateUpdateWorkOrderInput(request.body)

  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  try {
    const workOrder = await updateWorkOrder(
      request.params.workOrderId,
      validation.input ?? {},
    )

    if (!workOrder) {
      response.status(404).json({
        error: 'Work order not found',
        workOrderId: request.params.workOrderId,
      })
      return
    }

    response.json(workOrder)
  } catch (error) {
    next(error)
  }
}
