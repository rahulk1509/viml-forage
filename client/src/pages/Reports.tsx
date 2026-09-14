import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import type { Project } from '../types/Project'

type WorkOrderStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED'
type InspectionResult = 'PENDING' | 'PASS' | 'FAIL'

type WorkOrder = {
  id: string
  projectId: string
  title: string
  status: WorkOrderStatus
  progress: number
}

type Inspection = {
  id: string
  type: string
  result: InspectionResult
  inspectedAt: string
  project: { id: string; name: string }
  workOrder: { id: string; title: string }
  inspector: { id: string; name: string }
}

const workOrderLabels: Record<WorkOrderStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const project = value as Record<string, unknown>
  return (
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    typeof project.customer === 'string' &&
    typeof project.progress === 'number' &&
    typeof project.status === 'string' &&
    ['ON_TRACK', 'AT_RISK', 'DELAYED'].includes(project.status) &&
    typeof project.currentStage === 'string'
  )
}

function isWorkOrder(value: unknown): value is WorkOrder {
  if (!value || typeof value !== 'object') return false
  const workOrder = value as Record<string, unknown>
  return (
    typeof workOrder.id === 'string' &&
    typeof workOrder.projectId === 'string' &&
    typeof workOrder.title === 'string' &&
    typeof workOrder.progress === 'number' &&
    typeof workOrder.status === 'string' &&
    Object.prototype.hasOwnProperty.call(workOrderLabels, workOrder.status)
  )
}

function isInspection(value: unknown): value is Inspection {
  if (!value || typeof value !== 'object') return false
  const inspection = value as Record<string, unknown>
  const project = inspection.project as Record<string, unknown> | undefined
  const workOrder = inspection.workOrder as Record<string, unknown> | undefined
  const inspector = inspection.inspector as Record<string, unknown> | undefined
  return (
    typeof inspection.id === 'string' &&
    typeof inspection.type === 'string' &&
    typeof inspection.result === 'string' &&
    ['PENDING', 'PASS', 'FAIL'].includes(inspection.result) &&
    typeof inspection.inspectedAt === 'string' &&
    !!project &&
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    !!workOrder &&
    typeof workOrder.id === 'string' &&
    typeof workOrder.title === 'string' &&
    !!inspector &&
    typeof inspector.id === 'string' &&
    typeof inspector.name === 'string'
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function MetricCard({
  label,
  value,
  tone = 'text-slate-900',
}: {
  label: string
  value: number
  tone?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function ReportSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
      {message}
    </div>
  )
}

function Reports() {
  const [projects, setProjects] = useState<Project[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadReports() {
      try {
        setIsLoading(true)
        setError(null)
        const responses = await Promise.all([
          fetch('http://localhost:5000/api/projects', {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch('http://localhost:5000/api/work-orders', {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch('http://localhost:5000/api/inspections', {
            credentials: 'include',
            signal: controller.signal,
          }),
        ])

        const failedResponse = responses.find((response) => !response.ok)
        if (failedResponse) {
          throw new Error(`Unable to load reports (${failedResponse.status})`)
        }

        const [projectData, workOrderData, inspectionData] = await Promise.all(
          responses.map((response) => response.json() as Promise<unknown>),
        )
        if (
          !Array.isArray(projectData) ||
          !projectData.every(isProject) ||
          !Array.isArray(workOrderData) ||
          !workOrderData.every(isWorkOrder) ||
          !Array.isArray(inspectionData) ||
          !inspectionData.every(isInspection)
        ) {
          throw new Error('The reports API returned an invalid response')
        }

        setProjects(projectData)
        setWorkOrders(workOrderData)
        setInspections(inspectionData)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load reports',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadReports()
    return () => controller.abort()
  }, [])

  const projectsByProgress = useMemo(
    () => [...projects].sort((a, b) => a.progress - b.progress),
    [projects],
  )
  const activeProjects = projects.filter((project) => project.progress < 100)
  const attentionProjects = projects.filter(
    (project) => project.status === 'AT_RISK' || project.status === 'DELAYED',
  )
  const blockedWorkOrders = workOrders.filter(
    (workOrder) => workOrder.status === 'BLOCKED',
  )
  const failedInspections = inspections.filter(
    (inspection) => inspection.result === 'FAIL',
  )
  const workOrderCounts = {
    NOT_STARTED: workOrders.filter((item) => item.status === 'NOT_STARTED').length,
    IN_PROGRESS: workOrders.filter((item) => item.status === 'IN_PROGRESS').length,
    BLOCKED: blockedWorkOrders.length,
    COMPLETED: workOrders.filter((item) => item.status === 'COMPLETED').length,
  }
  const inspectionCounts = {
    PASS: inspections.filter((item) => item.result === 'PASS').length,
    FAIL: failedInspections.length,
    PENDING: inspections.filter((item) => item.result === 'PENDING').length,
  }

  if (isLoading) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading management reports...
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-red-800">Reports unavailable</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Management reporting
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Reports</h1>
        <p className="mt-2 text-slate-500">
          Read-only operational visibility across projects, production, and quality.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Total Projects" value={projects.length} />
        <MetricCard label="Active Projects" value={activeProjects.length} tone="text-blue-700" />
        <MetricCard label="At Risk / Delayed" value={attentionProjects.length} tone="text-amber-700" />
        <MetricCard label="Total Work Orders" value={workOrders.length} />
        <MetricCard label="Completed Work Orders" value={workOrderCounts.COMPLETED} tone="text-emerald-700" />
        <MetricCard label="Failed Inspections" value={failedInspections.length} tone="text-red-700" />
      </div>

      <ReportSection eyebrow="Portfolio health" title="Project Progress">
        {projectsByProgress.length === 0 ? (
          <EmptyState message="No projects are available." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="whitespace-nowrap px-6 py-4">Project ID</th>
                    <th className="whitespace-nowrap px-6 py-4">Project Name</th>
                    <th className="whitespace-nowrap px-6 py-4">Customer</th>
                    <th className="whitespace-nowrap px-6 py-4">Current Stage</th>
                    <th className="whitespace-nowrap px-6 py-4">Progress</th>
                    <th className="whitespace-nowrap px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectsByProgress.map((project) => (
                    <tr key={project.id} className="text-sm text-slate-700">
                      <td className="whitespace-nowrap px-6 py-5 font-semibold text-slate-900">
                        <Link to={`/projects/${encodeURIComponent(project.id)}`} className="hover:underline">
                          {project.id}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-5">{project.name}</td>
                      <td className="whitespace-nowrap px-6 py-5">{project.customer}</td>
                      <td className="whitespace-nowrap px-6 py-5">{project.currentStage}</td>
                      <td className="whitespace-nowrap px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-slate-700" style={{ width: `${project.progress}%` }} />
                          </div>
                          <span className="font-semibold text-slate-900">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-5">
                        <StatusBadge status={project.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ReportSection>

      <ReportSection eyebrow="Manufacturing activity" title="Production Overview">
        {workOrders.length === 0 ? (
          <EmptyState message="No work orders are available." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(workOrderLabels) as WorkOrderStatus[]).map((status) => {
              const count = workOrderCounts[status]
              const percentage = workOrders.length
                ? Math.round((count / workOrders.length) * 100)
                : 0
              return (
                <div key={status} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">{workOrderLabels[status]}</p>
                    <span className="text-2xl font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-slate-700" style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{percentage}% of work orders</p>
                </div>
              )
            })}
          </div>
        )}
      </ReportSection>

      <ReportSection eyebrow="Inspection performance" title="Quality Overview">
        {inspections.length === 0 ? (
          <EmptyState message="No inspections are available." />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total Inspections" value={inspections.length} />
              <MetricCard label="Pass" value={inspectionCounts.PASS} tone="text-emerald-700" />
              <MetricCard label="Fail" value={inspectionCounts.FAIL} tone="text-red-700" />
              <MetricCard label="Pending" value={inspectionCounts.PENDING} tone="text-amber-700" />
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {failedInspections.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No failed inspections.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="whitespace-nowrap px-6 py-4">Inspection ID</th>
                        <th className="whitespace-nowrap px-6 py-4">Project</th>
                        <th className="whitespace-nowrap px-6 py-4">Work Order</th>
                        <th className="whitespace-nowrap px-6 py-4">Inspection Type</th>
                        <th className="whitespace-nowrap px-6 py-4">Inspector</th>
                        <th className="whitespace-nowrap px-6 py-4">Inspected At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {failedInspections.map((inspection) => (
                        <tr key={inspection.id} className="text-sm text-slate-700">
                          <td className="whitespace-nowrap px-6 py-5 font-semibold text-slate-900">{inspection.id}</td>
                          <td className="whitespace-nowrap px-6 py-5">{inspection.project.id}</td>
                          <td className="whitespace-nowrap px-6 py-5">{inspection.workOrder.id}</td>
                          <td className="whitespace-nowrap px-6 py-5">{inspection.type}</td>
                          <td className="whitespace-nowrap px-6 py-5">{inspection.inspector.name}</td>
                          <td className="whitespace-nowrap px-6 py-5">{formatDate(inspection.inspectedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </ReportSection>

      <ReportSection eyebrow="Management focus" title="Attention Required">
        {attentionProjects.length === 0 && blockedWorkOrders.length === 0 && failedInspections.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
            No projects, work orders, or inspections currently require attention.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-900">At-risk or delayed projects</h3>
              {attentionProjects.length === 0 ? (
                <p className="mt-3 text-sm text-amber-800">None.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {attentionProjects.map((project) => (
                    <li key={project.id} className="flex items-center justify-between gap-3 text-sm text-amber-900">
                      <Link to={`/projects/${encodeURIComponent(project.id)}`} className="font-semibold hover:underline">{project.id}</Link>
                      <StatusBadge status={project.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="font-semibold text-red-900">Blocked work orders</h3>
              {blockedWorkOrders.length === 0 ? (
                <p className="mt-3 text-sm text-red-800">None.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-red-900">
                  {blockedWorkOrders.map((workOrder) => (
                    <li key={workOrder.id} className="font-semibold">{workOrder.id} <span className="font-normal">— {workOrder.title}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="font-semibold text-red-900">Failed inspections</h3>
              {failedInspections.length === 0 ? (
                <p className="mt-3 text-sm text-red-800">None.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-red-900">
                  {failedInspections.map((inspection) => (
                    <li key={inspection.id} className="font-semibold">{inspection.id} <span className="font-normal">— {inspection.project.id}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </ReportSection>
    </main>
  )
}

export default Reports
