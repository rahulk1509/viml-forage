export type ProjectStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED'

export const PROJECT_STAGES = [
  'RFQ',
  'ENGINEERING',
  'PROCUREMENT',
  'FABRICATION',
  'MACHINING',
  'ASSEMBLY',
  'QUALITY',
  'DISPATCH',
  'COMPLETED',
] as const

export type ProjectStage = (typeof PROJECT_STAGES)[number]

export type Project = {
  id: string
  name: string
  customer: string
  progress: number
  status: ProjectStatus
  currentStage: ProjectStage
}