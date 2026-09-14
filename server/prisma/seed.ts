import {
  PrismaClient,
  ProjectStage,
  ProjectStatus,
  InspectionResult,
  UserRole,
  WorkOrderStatus,
  DocumentStatus,
} from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const demoProjects = [
  {
    id: 'CM204',
    name: 'Cement Mill CM204',
    customer: 'ABC Cement',
    progress: 78,
    status: ProjectStatus.ON_TRACK,
    currentStage: ProjectStage.MACHINING,
  },
  {
    id: 'WH091',
    name: 'Wind Hub WH091',
    customer: 'XYZ Energy',
    progress: 62,
    status: ProjectStatus.AT_RISK,
    currentStage: ProjectStage.FABRICATION,
  },
  {
    id: 'BD442',
    name: 'Boiler Assembly BD442',
    customer: 'DEF Power',
    progress: 43,
    status: ProjectStatus.DELAYED,
    currentStage: ProjectStage.ENGINEERING,
  },
]

const demoWorkOrders = [
  {
    id: 'WO-CM204-01',
    projectId: 'CM204',
    title: 'Main Shaft Machining',
    operation: 'Shaft machining',
    machine: 'CNC Lathe 02',
    status: WorkOrderStatus.IN_PROGRESS,
    progress: 65,
    plannedStart: new Date('2026-09-15T08:00:00Z'),
    plannedEnd: new Date('2026-09-19T17:00:00Z'),
  },
  {
    id: 'WO-CM204-02',
    projectId: 'CM204',
    title: 'Mill Housing Machining',
    operation: 'Housing machining',
    machine: 'CNC Mill 01',
    status: WorkOrderStatus.NOT_STARTED,
    progress: 0,
    plannedStart: new Date('2026-09-22T08:00:00Z'),
    plannedEnd: new Date('2026-09-26T17:00:00Z'),
  },
  {
    id: 'WO-CM204-03',
    projectId: 'CM204',
    title: 'Final Inspection',
    operation: 'Dimensional inspection',
    machine: 'QA Station 01',
    status: WorkOrderStatus.NOT_STARTED,
    progress: 0,
    plannedStart: new Date('2026-09-29T08:00:00Z'),
    plannedEnd: new Date('2026-09-30T17:00:00Z'),
  },
  {
    id: 'WO-WH091-01',
    projectId: 'WH091',
    title: 'Tower Fabrication',
    operation: 'Structural fabrication',
    machine: 'Fabrication Bay 03',
    status: WorkOrderStatus.IN_PROGRESS,
    progress: 55,
    plannedStart: new Date('2026-09-16T08:00:00Z'),
    plannedEnd: new Date('2026-09-24T17:00:00Z'),
  },
  {
    id: 'WO-WH091-02',
    projectId: 'WH091',
    title: 'Welding Assembly',
    operation: 'Robot welding',
    machine: 'Robotic Welding Cell 01',
    status: WorkOrderStatus.BLOCKED,
    progress: 35,
    plannedStart: new Date('2026-09-25T08:00:00Z'),
    plannedEnd: new Date('2026-10-02T17:00:00Z'),
  },
  {
    id: 'WO-BD442-01',
    projectId: 'BD442',
    title: 'Boiler Tube Assembly',
    operation: 'Tube assembly',
    machine: 'Assembly Bay 02',
    status: WorkOrderStatus.IN_PROGRESS,
    progress: 30,
    plannedStart: new Date('2026-09-17T08:00:00Z'),
    plannedEnd: new Date('2026-09-26T17:00:00Z'),
  },
]

const demoInspections = [
  {
    id: 'INSP-CM204-01',
    projectId: 'CM204',
    workOrderId: 'WO-CM204-01',
    type: 'Dimensional inspection',
    result: InspectionResult.PASS,
    remarks: 'Shaft dimensions verified against approved drawing.',
    inspectedAt: new Date('2026-09-19T14:00:00Z'),
  },
  {
    id: 'INSP-CM204-02',
    projectId: 'CM204',
    workOrderId: 'WO-CM204-03',
    type: 'Final inspection',
    result: InspectionResult.PENDING,
    remarks: 'Awaiting completion of final inspection operation.',
    inspectedAt: new Date('2026-09-29T09:00:00Z'),
  },
  {
    id: 'INSP-WH091-01',
    projectId: 'WH091',
    workOrderId: 'WO-WH091-01',
    type: 'Fabrication quality check',
    result: InspectionResult.FAIL,
    remarks: 'Weld profile requires corrective work before release.',
    inspectedAt: new Date('2026-09-24T15:30:00Z'),
  },
  {
    id: 'INSP-BD442-01',
    projectId: 'BD442',
    workOrderId: 'WO-BD442-01',
    type: 'Assembly inspection',
    result: InspectionResult.PENDING,
    remarks: 'Inspection scheduled after tube assembly completion.',
    inspectedAt: new Date('2026-09-26T10:00:00Z'),
  },
]

const demoDocuments = [
  {
    id: 'DOC-CM204-001',
    projectId: 'CM204',
    name: 'Main Shaft General Arrangement',
    documentNumber: 'DWG-CM204-001',
    revision: 'B',
    documentType: 'DRAWING',
    status: DocumentStatus.ACTIVE,
    description: 'Approved general arrangement drawing for the main shaft.',
  },
  {
    id: 'DOC-WH091-001',
    projectId: 'WH091',
    name: 'Tower Fabrication Weld Map',
    documentNumber: 'DWG-WH091-014',
    revision: 'A',
    documentType: 'DRAWING',
    status: DocumentStatus.ACTIVE,
    description: 'Fabrication weld map issued for shop-floor use.',
  },
  {
    id: 'DOC-BD442-001',
    projectId: 'BD442',
    name: 'Boiler Tube Assembly Procedure',
    documentNumber: 'PROC-BD442-007',
    revision: '0',
    documentType: 'PROCEDURE',
    status: DocumentStatus.SUPERSEDED,
    description: 'Superseded assembly procedure retained for project history.',
  },
]

async function main() {
  for (const project of demoProjects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project,
      create: project,
    })
  }

  console.log(`Seeded ${demoProjects.length} projects.`)

  for (const workOrder of demoWorkOrders) {
    const { projectId, ...workOrderData } = workOrder

    await prisma.workOrder.upsert({
      where: { id: workOrder.id },
      update: {
        ...workOrderData,
        project: { connect: { id: projectId } },
      },
      create: {
        ...workOrderData,
        project: { connect: { id: projectId } },
      },
    })
  }

  console.log(`Seeded ${demoWorkOrders.length} work orders.`)

  for (const document of demoDocuments) {
    const { projectId, ...documentData } = document

    await prisma.document.upsert({
      where: { id: document.id },
      update: {
        ...documentData,
        project: { connect: { id: projectId } },
      },
      create: {
        ...documentData,
        project: { connect: { id: projectId } },
      },
    })
  }

  console.log(`Seeded ${demoDocuments.length} documents.`)

  const developmentAdminEmail = process.env.DEV_ADMIN_EMAIL
  const developmentAdminPassword = process.env.DEV_ADMIN_PASSWORD

  if (developmentAdminEmail && developmentAdminPassword) {
    const passwordHash = await bcrypt.hash(developmentAdminPassword, 12)
    await prisma.user.upsert({
      where: { email: developmentAdminEmail },
      update: {
        name: 'Development Admin',
        passwordHash,
        role: UserRole.ADMIN,
      },
      create: {
        name: 'Development Admin',
        email: developmentAdminEmail,
        passwordHash,
        role: UserRole.ADMIN,
      },
    })
    console.log(`Seeded development admin ${developmentAdminEmail}.`)
  } else {
    console.log(
      'Skipped development admin seed; DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD are not both set.',
    )
  }

  const inspector = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (inspector) {
    for (const inspection of demoInspections) {
      const { projectId, workOrderId, ...inspectionData } = inspection

      await prisma.inspection.upsert({
        where: { id: inspection.id },
        update: {
          ...inspectionData,
          project: { connect: { id: projectId } },
          workOrder: { connect: { id: workOrderId } },
          inspector: { connect: { id: inspector.id } },
        },
        create: {
          ...inspectionData,
          project: { connect: { id: projectId } },
          workOrder: { connect: { id: workOrderId } },
          inspector: { connect: { id: inspector.id } },
        },
      })
    }
    console.log(
      `Seeded ${demoInspections.length} inspections for inspector ${inspector.email}.`,
    )
  } else {
    console.log('Skipped inspection seed because no inspector user exists.')
  }

}

main()
  .catch((error) => {
    console.error('Database seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
