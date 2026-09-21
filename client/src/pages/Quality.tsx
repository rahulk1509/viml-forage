import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasAnyRole } from '../auth/permissions'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config/api'

type InspectionResult = 'PENDING' | 'PASS' | 'FAIL'

type Inspection = {
  id: string
  project: { id: string; name: string }
  workOrder: { id: string; title: string }
  inspector: { id: string; name: string }
  type: string
  result: InspectionResult
  remarks: string | null
  inspectedAt: string
}

type ProjectOption = { id: string; name: string }
type WorkOrderOption = { id: string; projectId: string; title: string }

const resultStyles: Record<
  InspectionResult,
  { label: string; dot: string; text: string; background: string }
> = {
  PASS: {
    label: 'Pass',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    background: 'bg-emerald-50',
  },
  FAIL: {
    label: 'Fail',
    dot: 'bg-red-500',
    text: 'text-red-700',
    background: 'bg-red-50',
  },
  PENDING: {
    label: 'Pending',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    background: 'bg-amber-50',
  },
}

function isInspection(value: unknown): value is Inspection {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  const project = item.project as Record<string, unknown> | undefined
  const workOrder = item.workOrder as Record<string, unknown> | undefined
  const inspector = item.inspector as Record<string, unknown> | undefined

  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.result === 'string' &&
    item.result in resultStyles &&
    typeof item.inspectedAt === 'string' &&
    (item.remarks === null || typeof item.remarks === 'string') &&
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

function ResultBadge({ result }: { result: InspectionResult }) {
  const style = resultStyles[result]
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.background} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}

function Quality() {
  const { user } = useAuth()
  const canCreateInspection = hasAnyRole(user, 'ADMIN', 'PROJECT_MANAGER', 'QA')
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([])
  const [selectedProject, setSelectedProject] = useState('ALL')
  const [selectedResult, setSelectedResult] = useState<'ALL' | InspectionResult>(
    'ALL',
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    projectId: '',
    workOrderId: '',
    type: '',
    result: 'PENDING' as InspectionResult,
    remarks: '',
    inspectedAt: new Date().toISOString().slice(0, 16),
  })

  async function loadQualityData(signal?: AbortSignal) {
    const [inspectionResponse, projectResponse, workOrderResponse] =
      await Promise.all([
        fetch(`${API_BASE_URL}/api/inspections`, {
          credentials: 'include',
          signal,
        }),
        fetch(`${API_BASE_URL}/api/projects`, {
          credentials: 'include',
          signal,
        }),
        fetch(`${API_BASE_URL}/api/work-orders`, {
          credentials: 'include',
          signal,
        }),
      ])

    if (!inspectionResponse.ok) {
      throw new Error(`Unable to load inspections (${inspectionResponse.status})`)
    }
    if (!projectResponse.ok || !workOrderResponse.ok) {
      throw new Error('Unable to load project and work order options')
    }

    const inspectionData: unknown = await inspectionResponse.json()
    const projectData: unknown = await projectResponse.json()
    const workOrderData: unknown = await workOrderResponse.json()
    if (
      !Array.isArray(inspectionData) ||
      !inspectionData.every(isInspection) ||
      !Array.isArray(projectData) ||
      !Array.isArray(workOrderData)
    ) {
      throw new Error('The Quality API returned an invalid response')
    }

    setInspections(inspectionData)
    setProjects(
      projectData.filter(
        (project): project is ProjectOption =>
          !!project &&
          typeof project === 'object' &&
          typeof (project as Record<string, unknown>).id === 'string' &&
          typeof (project as Record<string, unknown>).name === 'string',
      ),
    )
    setWorkOrders(
      workOrderData.filter(
        (workOrder): workOrder is WorkOrderOption =>
          !!workOrder &&
          typeof workOrder === 'object' &&
          typeof (workOrder as Record<string, unknown>).id === 'string' &&
          typeof (workOrder as Record<string, unknown>).projectId === 'string' &&
          typeof (workOrder as Record<string, unknown>).title === 'string',
      ),
    )
  }

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    loadQualityData(controller.signal)
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load quality data',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [])

  const filteredInspections = useMemo(
    () =>
      inspections.filter(
        (inspection) =>
          (selectedProject === 'ALL' ||
            inspection.project.id === selectedProject) &&
          (selectedResult === 'ALL' || inspection.result === selectedResult),
      ),
    [inspections, selectedProject, selectedResult],
  )

  const visibleWorkOrders = workOrders.filter(
    (workOrder) => !form.projectId || workOrder.projectId === form.projectId,
  )
  const counts = {
    total: inspections.length,
    pass: inspections.filter((inspection) => inspection.result === 'PASS').length,
    fail: inspections.filter((inspection) => inspection.result === 'FAIL').length,
    pending: inspections.filter((inspection) => inspection.result === 'PENDING')
      .length,
  }

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    if (field === 'projectId') {
      setForm((current) => ({ ...current, workOrderId: '' }))
    }
  }

  async function submitInspection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setFormError('Your authenticated user could not be identified.')
      return
    }

    if (
      !form.projectId ||
      !form.workOrderId ||
      !form.type.trim() ||
      !form.inspectedAt
    ) {
      setFormError('Project, Work Order, type, and inspection date are required.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/inspections`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          inspectorId: user.id,
          type: form.type.trim(),
          remarks: form.remarks.trim() || undefined,
          inspectedAt: new Date(form.inspectedAt).toISOString(),
        }),
      })
      if (!response.ok) {
        let message = `Unable to create inspection (${response.status})`
        try {
          const data: { error?: string } = await response.json()
          if (data.error) message = data.error
        } catch {
          // Keep the status-based message when the API response is not JSON.
        }
        throw new Error(message)
      }

      await loadQualityData()
      setIsModalOpen(false)
      setForm({
        projectId: '',
        workOrderId: '',
        type: '',
        result: 'PENDING',
        remarks: '',
        inspectedAt: new Date().toISOString().slice(0, 16),
      })
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create inspection',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Quality assurance
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Quality</h1>
          <p className="mt-2 text-slate-500">
            Review inspection results across active manufacturing work.
          </p>
        </div>
        {canCreateInspection && (
          <button
            type="button"
            onClick={() => {
              setFormError(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            New Inspection
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total Inspections', counts.total, 'text-slate-900'],
          ['Passed', counts.pass, 'text-emerald-700'],
          ['Failed', counts.fail, 'text-red-700'],
          ['Pending', counts.pending, 'text-amber-700'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading inspections...
        </div>
      )}
      {!isLoading && error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}
      {!isLoading && !error && (
        <>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <label className="text-sm font-semibold text-slate-700">
              Project
              <select
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
                className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="ALL">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Result
              <select
                value={selectedResult}
                onChange={(event) =>
                  setSelectedResult(event.target.value as 'ALL' | InspectionResult)
                }
                className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="ALL">All Results</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
                <option value="PENDING">Pending</option>
              </select>
            </label>
          </div>

          {filteredInspections.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="font-semibold text-slate-900">No inspections found</h2>
              <p className="mt-2 text-sm text-slate-500">
                No inspections match the selected filters.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-6 py-4">Inspection ID</th>
                      <th className="whitespace-nowrap px-6 py-4">Project</th>
                      <th className="whitespace-nowrap px-6 py-4">Work Order</th>
                      <th className="whitespace-nowrap px-6 py-4">Inspection Type</th>
                      <th className="whitespace-nowrap px-6 py-4">Inspector</th>
                      <th className="whitespace-nowrap px-6 py-4">Result</th>
                      <th className="whitespace-nowrap px-6 py-4">Inspected At</th>
                      <th className="whitespace-nowrap px-6 py-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInspections.map((inspection) => (
                      <tr key={inspection.id} className="text-sm text-slate-700">
                        <td className="whitespace-nowrap px-6 py-5 font-semibold text-slate-900">
                          {inspection.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-5">
                          <Link
                            to={`/projects/${encodeURIComponent(inspection.project.id)}`}
                            className="font-semibold hover:text-slate-950 hover:underline"
                          >
                            {inspection.project.id}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{inspection.project.name}</p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-5">
                          <p className="font-semibold text-slate-800">{inspection.workOrder.id}</p>
                          <p className="mt-1 text-xs text-slate-500">{inspection.workOrder.title}</p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-5">{inspection.type}</td>
                        <td className="whitespace-nowrap px-6 py-5">{inspection.inspector.name}</td>
                        <td className="whitespace-nowrap px-6 py-5">
                          <ResultBadge result={inspection.result} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-5">{formatDate(inspection.inspectedAt)}</td>
                        <td className="max-w-xs px-6 py-5 text-slate-500">{inspection.remarks ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quality administration
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">New inspection</h2>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>
            <form onSubmit={submitInspection} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Project
                  <select required value={form.projectId} onChange={(event) => updateForm('projectId', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500">
                    <option value="">Select project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.id} — {project.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Work Order
                  <select required value={form.workOrderId} onChange={(event) => updateForm('workOrderId', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500">
                    <option value="">Select work order</option>
                    {visibleWorkOrders.map((workOrder) => <option key={workOrder.id} value={workOrder.id}>{workOrder.id} — {workOrder.title}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Inspection Type
                  <input required value={form.type} onChange={(event) => updateForm('type', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Result
                  <select value={form.result} onChange={(event) => updateForm('result', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500">
                    <option value="PENDING">Pending</option>
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Inspected At
                  <input required type="datetime-local" value={form.inspectedAt} onChange={(event) => updateForm('inspectedAt', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500" />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Remarks
                  <textarea value={form.remarks} onChange={(event) => updateForm('remarks', event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500" />
                </label>
              </div>
              {formError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? 'Saving...' : 'Create Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default Quality
