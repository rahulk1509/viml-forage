import { ProjectStage, ProjectStatus } from '@prisma/client'
import prisma from '../../lib/prisma.js'

export type CreateProjectInput = {
  id: string
  name: string
  customer: string
  progress: number
  status: ProjectStatus
  currentStage: ProjectStage
}

export type UpdateProjectInput = Partial<
  Pick<CreateProjectInput, 'name' | 'customer' | 'progress' | 'status' | 'currentStage'>
>

export function findProjects() {
  return prisma.project.findMany()
}

export function findProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
  })
}

export function createProject(input: CreateProjectInput) {
  return prisma.project.create({
    data: input,
  })
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
) {
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!existingProject) return null

  return prisma.project.update({
    where: { id: projectId },
    data: input,
  })
}
