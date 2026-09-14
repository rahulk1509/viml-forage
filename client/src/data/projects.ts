import type { Project } from '../types/Project'

export const projects: Project[] = [
  {
    id: 'CM204',
    name: 'Cement Mill CM204',
    customer: 'ABC Cement',
    progress: 78,
    status: 'ON_TRACK',
    currentStage: 'MACHINING',
  },
  {
    id: 'WH091',
    name: 'Wind Hub WH091',
    customer: 'XYZ Energy',
    progress: 62,
    status: 'AT_RISK',
    currentStage: 'FABRICATION',
  },
  {
    id: 'BD442',
    name: 'Boiler Assembly BD442',
    customer: 'DEF Power',
    progress: 43,
    status: 'DELAYED',
    currentStage: 'ENGINEERING',
  },
]
