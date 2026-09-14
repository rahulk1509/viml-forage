import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasAnyRole } from '../auth/permissions'
import { useAuth } from '../context/AuthContext'

type WorkOrderStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'

type WorkOrder = {
  id: string
  projectId: string
  title: string
  operation: string
  machine: string
  status: WorkOrderStatus
  progress: number
  plannedStart: string | null
  plannedEnd: string | null
}

const statusStyles: Record<
  WorkOrderStatus,
  { label: string; dot: string; text: string; background: string }
> = {
  NOT_STARTED: {
    label: 'Not started',
    dot: 'bg-slate-400',
    text: 'text-slate-600',
    background: 'bg-slate-100',
  },
  IN_PROGRESS: {
    label: 'In progress',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    background: 'bg-blue-50',
  },
  BLOCKED: {
    label: 'Blocked',
    dot: 'bg-red-500',
    text: 'text-red-700',
    background: 'bg-red-50',
  },
  COMPLETED: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    background: 'bg-emerald-50',
  },
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function isWorkOrder(value: unknown): value is WorkOrder {
  if (!value || typeof value !== 'object') return false

  const workOrder = value as Record<string, unknown>
  return (
    typeof workOrder.id === 'string' &&
    typeof workOrder.projectId === 'string' &&
    typeof workOrder.title === 'string' &&
    typeof workOrder.operation === 'string' &&
    typeof workOrder.machine === 'string' &&
    typeof workOrder.status === 'string' &&
    workOrder.status in statusStyles &&
    typeof workOrder.progress === 'number' &&
    (typeof workOrder.plannedStart === 'string' ||
      workOrder.plannedStart === null) &&
    (typeof workOrder.plannedEnd === 'string' || workOrder.plannedEnd === null)
  )
}

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const style = statusStyles[status]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${style.background} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}

function Production() {
  const { user } = useAuth()
  const canEdit = hasAnyRole(
    user,
    'ADMIN',
    'PROJECT_MANAGER',
    'ENGINEER',
    'SHOP_FLOOR',
  )
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState<
    'ALL' | WorkOrderStatus
  >('ALL')
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<string | null>(
    null,
  )
  const [draftStatus, setDraftStatus] = useState<WorkOrderStatus>('NOT_STARTED')
  const [draftProgress, setDraftProgress] = useState('')
  const [savingWorkOrderId, setSavingWorkOrderId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const projectIds = useMemo(
    () => [...new Set(workOrders.map((workOrder) => workOrder.projectId))].sort(),
    [workOrders],
  )
  const filteredWorkOrders = useMemo(
    () =>
      workOrders.filter(
        (workOrder) =>
          (selectedProjectId === 'ALL' ||
            workOrder.projectId === selectedProjectId) &&
          (selectedStatus === 'ALL' || workOrder.status === selectedStatus),
      ),
    [selectedProjectId, selectedStatus, workOrders],
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadWorkOrders() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('http://localhost:5000/api/work-orders', {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Unable to load work orders (${response.status})`)
        }

        const data: unknown = await response.json()
        if (!Array.isArray(data) || !data.every(isWorkOrder)) {
          throw new Error('The work orders API returned an invalid response')
        }

        setWorkOrders(data)
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === 'AbortError'
        ) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load work orders',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadWorkOrders()

    return () => controller.abort()
  }, [])

  function startEditing(workOrder: WorkOrder) {
    setEditingWorkOrderId(workOrder.id)
    setDraftStatus(workOrder.status)
    setDraftProgress(String(workOrder.progress))
    setEditError(null)
  }

  function cancelEditing() {
    setEditingWorkOrderId(null)
    setDraftProgress('')
    setEditError(null)
  }

  async function saveWorkOrder() {
    if (!editingWorkOrderId) return

    const progress = Number(draftProgress)
    if (
      !Number.isInteger(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      setEditError('Progress must be an integer from 0 to 100.')
      return
    }

    setSavingWorkOrderId(editingWorkOrderId)
    setEditError(null)

    try {
      const response = await fetch(
        `http://localhost:5000/api/work-orders/${encodeURIComponent(editingWorkOrderId)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            progress,
            status: draftStatus,
          }),
        },
      )

      if (!response.ok) {
        let message = `Unable to update work order (${response.status})`
        try {
          const responseBody: unknown = await response.json()
          if (
            responseBody &&
            typeof responseBody === 'object' &&
            'error' in responseBody &&
            typeof responseBody.error === 'string'
          ) {
            message = responseBody.error
          }
        } catch {
          // Keep the status-based message when the API does not return JSON.
        }
        throw new Error(message)
      }

      const data: unknown = await response.json()
      if (!isWorkOrder(data)) {
        throw new Error('The work order update returned an invalid response')
      }

      setWorkOrders((currentWorkOrders) =>
        currentWorkOrders.map((workOrder) =>
          workOrder.id === data.id ? data : workOrder,
        ),
      )
      cancelEditing()
    } catch (requestError) {
      setEditError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update work order',
      )
    } finally {
      setSavingWorkOrderId(null)
    }
  }

  return (
    <main className="p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Manufacturing operations
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Production</h1>
        <p className="mt-2 text-slate-500">
          Monitor active work orders, machine allocation, and production progress.
        </p>
      </div>

      {isLoading && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading work orders...
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!isLoading && !error && workOrders.length > 0 && (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label
              htmlFor="project-filter"
              className="text-sm font-semibold text-slate-700"
            >
              Filter by project
            </label>
            <select
              id="project-filter"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-slate-500"
            >
              <option value="ALL">All Projects</option>
              {projectIds.map((projectId) => (
                <option key={projectId} value={projectId}>
                  {projectId}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label
              htmlFor="status-filter"
              className="text-sm font-semibold text-slate-700"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value as 'ALL' | WorkOrderStatus,
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-slate-500"
            >
              <option value="ALL">All Statuses</option>
              {Object.entries(statusStyles).map(([status, style]) => (
                <option key={status} value={status}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isLoading && !error && workOrders.length === 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="font-semibold text-slate-900">No work orders found</h2>
          <p className="mt-2 text-sm text-slate-500">
            Production work orders will appear here when they are created.
          </p>
        </div>
      )}

      {!isLoading && !error && workOrders.length > 0 && filteredWorkOrders.length === 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="font-semibold text-slate-900">
            No work orders match the selected filters.
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Select different project or status filters to view production work
            orders.
          </p>
        </div>
      )}

      {!isLoading && !error && filteredWorkOrders.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full table-auto text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="min-w-[220px] whitespace-nowrap px-6 py-4">Work Order</th>
                  <th className="min-w-[120px] whitespace-nowrap px-6 py-4">Project</th>
                  <th className="min-w-[190px] whitespace-nowrap px-6 py-4">Operation</th>
                  <th className="min-w-[190px] whitespace-nowrap px-6 py-4">Machine</th>
                  <th className="min-w-[150px] whitespace-nowrap px-6 py-4">Status</th>
                  <th className="min-w-[170px] whitespace-nowrap px-6 py-4">Progress</th>
                  <th className="min-w-[150px] whitespace-nowrap px-6 py-4">Planned Start</th>
                  <th className="min-w-[150px] whitespace-nowrap px-6 py-4">Planned End</th>
                  <th className="min-w-[180px] whitespace-nowrap px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkOrders.map((workOrder) => (
                  <tr key={workOrder.id} className="text-sm text-slate-700">
                    <td className="min-w-[220px] whitespace-nowrap px-6 py-5">
                      <p className="font-semibold text-slate-900">{workOrder.id}</p>
                      <p className="mt-1 text-xs text-slate-500">{workOrder.title}</p>
                    </td>
                    <td className="min-w-[120px] whitespace-nowrap px-6 py-5">
                      <Link
                        to={`/projects/${encodeURIComponent(workOrder.projectId)}`}
                        className="font-semibold text-slate-700 hover:text-slate-950 hover:underline"
                      >
                        {workOrder.projectId}
                      </Link>
                    </td>
                    <td className="min-w-[190px] whitespace-nowrap px-6 py-5">{workOrder.operation}</td>
                    <td className="min-w-[190px] whitespace-nowrap px-6 py-5">{workOrder.machine}</td>
                    <td className="min-w-[150px] whitespace-nowrap px-6 py-5">
                      {editingWorkOrderId === workOrder.id ? (
                        <select
                          value={draftStatus}
                          onChange={(event) =>
                            setDraftStatus(
                              event.target.value as WorkOrderStatus,
                            )
                          }
                          disabled={savingWorkOrderId === workOrder.id}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-500"
                          aria-label={`Status for ${workOrder.id}`}
                        >
                          {Object.entries(statusStyles).map(
                            ([status, style]) => (
                              <option key={status} value={status}>
                                {style.label}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <StatusBadge status={workOrder.status} />
                      )}
                    </td>
                    <td className="min-w-[170px] whitespace-nowrap px-6 py-5">
                      {editingWorkOrderId === workOrder.id ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={draftProgress}
                          onChange={(event) =>
                            setDraftProgress(event.target.value)
                          }
                          disabled={savingWorkOrderId === workOrder.id}
                          className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                          aria-label={`Progress for ${workOrder.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-800"
                              style={{ width: `${workOrder.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {workOrder.progress}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {formatDate(workOrder.plannedStart)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {formatDate(workOrder.plannedEnd)}
                    </td>
                    <td className="min-w-[180px] whitespace-nowrap px-6 py-5">
                      {editingWorkOrderId === workOrder.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveWorkOrder}
                              disabled={savingWorkOrderId === workOrder.id}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingWorkOrderId === workOrder.id
                                ? 'Saving...'
                                : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={savingWorkOrderId === workOrder.id}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                          {editError && (
                            <p className="max-w-44 text-xs text-red-600">
                              {editError}
                            </p>
                          )}
                        </div>
                      ) : canEdit ? (
                        <button
                          type="button"
                          onClick={() => startEditing(workOrder)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-500 hover:text-slate-900"
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}

export default Production
