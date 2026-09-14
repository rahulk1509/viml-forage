import { InspectionResult } from '@prisma/client'
import type { RequestHandler } from 'express'
import {
  createInspection,
  findInspections,
  findInspectionsByProjectId,
  findInspectionsByWorkOrderId,
  type CreateInspectionInput,
} from './quality.service.js'

function isInspectionResult(value: unknown): value is InspectionResult {
  return (
    typeof value === 'string' &&
    Object.values(InspectionResult).includes(value as InspectionResult)
  )
}

function parseCreateInspectionInput(body: unknown): {
  input?: CreateInspectionInput
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const data = body as Record<string, unknown>
  const requiredTextFields = [
    'projectId',
    'workOrderId',
    'inspectorId',
    'type',
    'inspectedAt',
  ]
  const missingField = requiredTextFields.find(
    (field) => typeof data[field] !== 'string' || data[field].trim() === '',
  )

  if (missingField) return { error: `${missingField} is required` }
  if (!isInspectionResult(data.result)) {
    return { error: 'result must be a valid inspection result' }
  }
  if ('remarks' in data && data.remarks !== undefined && typeof data.remarks !== 'string') {
    return { error: 'remarks must be a string' }
  }

  const inspectedAt = new Date(data.inspectedAt as string)
  if (Number.isNaN(inspectedAt.getTime())) {
    return { error: 'inspectedAt must be a valid date' }
  }

  return {
    input: {
      projectId: data.projectId as string,
      workOrderId: data.workOrderId as string,
      inspectorId: data.inspectorId as string,
      type: data.type as string,
      result: data.result,
      remarks: data.remarks as string | undefined,
      inspectedAt,
    },
  }
}

export const getInspections: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await findInspections())
  } catch (error) {
    next(error)
  }
}

export const getProjectInspections: RequestHandler<{
  projectId: string
}> = async (request, response, next) => {
  try {
    const inspections = await findInspectionsByProjectId(request.params.projectId)
    if (inspections === null) {
      response.status(404).json({
        error: 'Project not found',
        projectId: request.params.projectId,
      })
      return
    }

    response.json(inspections)
  } catch (error) {
    next(error)
  }
}

export const getWorkOrderInspections: RequestHandler<{
  workOrderId: string
}> = async (request, response, next) => {
  try {
    const inspections = await findInspectionsByWorkOrderId(
      request.params.workOrderId,
    )
    if (inspections === null) {
      response.status(404).json({
        error: 'Work order not found',
        workOrderId: request.params.workOrderId,
      })
      return
    }

    response.json(inspections)
  } catch (error) {
    next(error)
  }
}

export const createInspectionHandler: RequestHandler = async (
  request,
  response,
  next,
) => {
  const validation = parseCreateInspectionInput(request.body)
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  try {
    const result = await createInspection(validation.input!)
    if (result.kind === 'missing-reference') {
      response.status(404).json({
        error: 'One or more referenced records were not found',
        missing: result.missing,
      })
      return
    }
    if (result.kind === 'project-mismatch') {
      response.status(400).json({
        error: 'Work order does not belong to the specified project',
      })
      return
    }

    response.status(201).json(result.inspection)
  } catch (error) {
    next(error)
  }
}
