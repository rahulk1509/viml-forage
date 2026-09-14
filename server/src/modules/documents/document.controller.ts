import { DocumentStatus } from '@prisma/client'
import type { RequestHandler } from 'express'
import {
  createDocument,
  findDocumentsByProject,
  findDocuments,
  type CreateDocumentInput,
} from './document.service.js'

function isDocumentStatus(value: unknown): value is DocumentStatus {
  return (
    typeof value === 'string' &&
    Object.values(DocumentStatus).includes(value as DocumentStatus)
  )
}

function parseCreateDocumentInput(body: unknown): {
  input?: CreateDocumentInput
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' }
  }

  const data = body as Record<string, unknown>
  const requiredTextFields = [
    'projectId',
    'name',
    'documentNumber',
    'revision',
    'documentType',
  ]
  const missingField = requiredTextFields.find(
    (field) => typeof data[field] !== 'string' || data[field].trim() === '',
  )

  if (missingField) return { error: `${missingField} is required` }
  if (!isDocumentStatus(data.status)) {
    return { error: 'status must be a valid document status' }
  }
  if (
    'description' in data &&
    data.description !== undefined &&
    data.description !== null &&
    typeof data.description !== 'string'
  ) {
    return { error: 'description must be a string' }
  }

  return {
    input: {
      projectId: data.projectId as string,
      name: (data.name as string).trim(),
      documentNumber: (data.documentNumber as string).trim(),
      revision: (data.revision as string).trim(),
      documentType: (data.documentType as string).trim(),
      status: data.status,
      description:
        typeof data.description === 'string'
          ? data.description.trim() || undefined
          : undefined,
    },
  }
}

export const getDocuments: RequestHandler = async (_request, response, next) => {
  try {
    response.json(await findDocuments())
  } catch (error) {
    next(error)
  }
}

export const getProjectDocuments: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const projectId = String(request.params.projectId)
    const documents = await findDocumentsByProject(projectId)
    if (!documents) {
      response.status(404).json({
        error: 'Project not found',
        projectId,
      })
      return
    }

    response.json(documents)
  } catch (error) {
    next(error)
  }
}

export const createDocumentHandler: RequestHandler = async (
  request,
  response,
  next,
) => {
  const validation = parseCreateDocumentInput(request.body)
  if (validation.error) {
    response.status(400).json({ error: validation.error })
    return
  }

  try {
    const document = await createDocument(validation.input!)
    if (!document) {
      response.status(404).json({
        error: 'Project not found',
        projectId: validation.input!.projectId,
      })
      return
    }

    response.status(201).json(document)
  } catch (error) {
    next(error)
  }
}
