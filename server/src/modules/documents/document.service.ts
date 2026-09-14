import { DocumentStatus } from '@prisma/client'
import prisma from '../../lib/prisma.js'

const documentInclude = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
} as const

export type CreateDocumentInput = {
  projectId: string
  name: string
  documentNumber: string
  revision: string
  documentType: string
  status: DocumentStatus
  description?: string
}

export function findDocuments() {
  return prisma.document.findMany({
    include: documentInclude,
    orderBy: { updatedAt: 'desc' },
  })
}

export async function findDocumentsByProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })

  if (!project) return null

  return prisma.document.findMany({
    where: { projectId },
    include: documentInclude,
    orderBy: { updatedAt: 'desc' },
  })
}

export async function createDocument(input: CreateDocumentInput) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  })

  if (!project) return null

  return prisma.document.create({
    data: {
      name: input.name,
      documentNumber: input.documentNumber,
      revision: input.revision,
      documentType: input.documentType,
      status: input.status,
      description: input.description,
      project: { connect: { id: input.projectId } },
    },
    include: documentInclude,
  })
}
