import { WorkOrderStatus } from '@prisma/client'
import prisma from '../../lib/prisma.js'

export type UpdateWorkOrderInput = Partial<{
  status: WorkOrderStatus
  progress: number
}>

export function findWorkOrders() {
  return prisma.workOrder.findMany()
}

export async function findWorkOrdersByProjectId(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      workOrders: true,
    },
  })

  return project
}

export async function updateWorkOrder(
  workOrderId: string,
  input: UpdateWorkOrderInput,
) {
  const existingWorkOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
  })

  if (!existingWorkOrder) return null

  return prisma.workOrder.update({
    where: { id: workOrderId },
    data: input,
  })
}
