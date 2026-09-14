import { Prisma, ProjectStage, ProjectStatus } from '@prisma/client'
import type { RequestHandler } from 'express'
import {
  createProject,
  findProjectById,
  findProjects,
  type CreateProjectInput,
  updateProject,
  type UpdateProjectInput,
} from './project.service.js'

export const getProjects: RequestHandler = async (_request, response, next) => {
  try {
    const projects = await findProjects()
    response.json(projects)
  } catch (error) {
    next(error)
  }
}

export const getProjectById: RequestHandler<{ projectId: string }> = async (
  request,
  response,
  next,
) => {
  try {
    const project = await findProjectById(request.params.projectId)

    if (!project) {
      response.status(404).json({
        error: 'Project not found',
        projectId: request.params.projectId,
      })
      return
    }

    response.json(project)
  } catch (error) {
    next(error)
  }
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === 'string' &&
    Object.values(ProjectStatus).includes(value as ProjectStatus)
  )
}

function isProjectStage(value: unknown): value is ProjectStage {
  return (
    typeof value === 'string' &&
    Object.values(ProjectStage).includes(value as ProjectStage)
  )
}

function validateUpdateProjectInput(body: unknown): {
  input?: UpdateProjectInput
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const data = body as Record<string, unknown>
  const allowedFields = [
    'name',
    'customer',
    'progress',
    'status',
    'currentStage',
  ] as const
  const providedFields = allowedFields.filter((field) => field in data)

  if (providedFields.length === 0) {
    return { error: 'At least one project field is required for update' }
  }

  if (
    'name' in data &&
    (typeof data.name !== 'string' || data.name.trim() === '')
  ) {
    return { error: 'name must be a non-empty string' }
  }

  if (
    'customer' in data &&
    (typeof data.customer !== 'string' || data.customer.trim() === '')
  ) {
    return { error: 'customer must be a non-empty string' }
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

  if ('status' in data && !isProjectStatus(data.status)) {
    return { error: 'status must be a valid project status' }
  }

  if ('currentStage' in data && !isProjectStage(data.currentStage)) {
    return { error: 'currentStage must be a valid project stage' }
  }

  const input: UpdateProjectInput = {}
  if ('name' in data) input.name = data.name as string
  if ('customer' in data) input.customer = data.customer as string
  if ('progress' in data) input.progress = data.progress as number
  if ('status' in data) input.status = data.status as ProjectStatus
  if ('currentStage' in data) {
    input.currentStage = data.currentStage as ProjectStage
  }

  return { input }
}

function validateCreateProjectInput(body: unknown): {
  input?: CreateProjectInput
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const data = body as Record<string, unknown>
  const requiredFields = ['id', 'name', 'customer']
  const missingField = requiredFields.find(
    (field) => typeof data[field] !== 'string' || data[field].trim() === '',
  )

  if (missingField) {
    return { error: `${missingField} is required` }
  }

  if (
    typeof data.progress !== 'number' ||
    !Number.isInteger(data.progress) ||
    data.progress < 0 ||
    data.progress > 100
  ) {
    return { error: 'progress must be an integer between 0 and 100' }
  }

  if (!isProjectStatus(data.status)) {
    return { error: 'status must be a valid project status' }
  }

  if (!isProjectStage(data.currentStage)) {
    return { error: 'currentStage must be a valid project stage' }
  }

  return {
    input: {
      id: data.id as string,
      name: data.name as string,
      customer: data.customer as string,
      progress: data.progress,
      status: data.status,
      currentStage: data.currentStage,
    },
  }
}

export const createProjectHandler: RequestHandler = async (
  request,
  response,
  next,
) => {
  const validation = validateCreateProjectInput(request.body)

  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  try {
    const project = await createProject(validation.input!)
    response.status(201).json(project)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      response.status(409).json({
        error: 'A project with this id already exists',
      })
      return
    }

    next(error)
  }
}

export const updateProjectHandler: RequestHandler<{
  projectId: string
}> = async (request, response, next) => {
  const validation = validateUpdateProjectInput(request.body)

  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  try {
    const project = await updateProject(
      request.params.projectId,
      validation.input ?? {},
    )

    if (!project) {
      response.status(404).json({
        error: 'Project not found',
        projectId: request.params.projectId,
      })
      return
    }

    response.json(project)
  } catch (error) {
    next(error)
  }
}
