import { InspectionResult } from '@prisma/client'
import prisma from '../../lib/prisma.js'

const inspectionInclude = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  workOrder: {
    select: {
      id: true,
      title: true,
    },
  },
  inspector: {
    select: {
      id: true,
      name: true,
    },
  },
} as const

export type CreateInspectionInput = {
  projectId: string
  workOrderId: string
  inspectorId: string
  type: string
  result: InspectionResult
  remarks?: string
  inspectedAt: Date
}

export function findInspections() {
  return prisma.inspection.findMany({
    include: inspectionInclude,
    orderBy: { inspectedAt: 'desc' },
  })
}

export async function findInspectionsByProjectId(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) return null

  return prisma.inspection.findMany({
    where: { projectId },
    include: inspectionInclude,
    orderBy: { inspectedAt: 'desc' },
  })
}

export async function findInspectionsByWorkOrderId(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
  })

  if (!workOrder) return null

  return prisma.inspection.findMany({
    where: { workOrderId },
    include: inspectionInclude,
    orderBy: { inspectedAt: 'desc' },
  })
}

export async function createInspection(input: CreateInspectionInput) {
  const [project, workOrder, inspector] = await Promise.all([
    prisma.project.findUnique({ where: { id: input.projectId } }),
    prisma.workOrder.findUnique({ where: { id: input.workOrderId } }),
    prisma.user.findUnique({ where: { id: input.inspectorId } }),
  ])

  if (!project || !workOrder || !inspector) {
    return {
      kind: 'missing-reference' as const,
      missing: {
        project: !project,
        workOrder: !workOrder,
        inspector: !inspector,
      },
    }
  }

  if (workOrder.projectId !== project.id) {
    return { kind: 'project-mismatch' as const }
  }

  const inspection = await prisma.inspection.create({
    data: {
      project: { connect: { id: input.projectId } },
      workOrder: { connect: { id: input.workOrderId } },
      inspector: { connect: { id: input.inspectorId } },
      type: input.type,
      result: input.result,
      remarks: input.remarks,
      inspectedAt: input.inspectedAt,
    },
    include: inspectionInclude,
  })

  return { kind: 'created' as const, inspection }
}
