import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import { hasAnyRole } from '../auth/permissions'
import { useAuth } from '../context/AuthContext'
import {
  PROJECT_STAGES,
  type Project,
  type ProjectStatus,
} from '../types/Project'

type ProjectDraft = Pick<
  Project,
  'name' | 'customer' | 'progress' | 'status' | 'currentStage'
>

function ProjectDetails() {
  const { user } = useAuth()
  const canEdit = hasAnyRole(user, 'ADMIN', 'PROJECT_MANAGER')
  const { projectId } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [draft, setDraft] = useState<ProjectDraft | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProject() {
      if (!projectId) {
        setError('Project not found')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        setProject(null)

        const response = await fetch(
          `http://localhost:5000/api/projects/${encodeURIComponent(projectId)}`,
          { credentials: 'include', signal: controller.signal },
        )

        if (response.status === 404) {
          setError('Project not found')
          return
        }

        if (!response.ok) {
          throw new Error(`Unable to load project (${response.status})`)
        }

        const data: Project = await response.json()
        setProject(data)
        setDraft({
          name: data.name,
          customer: data.customer,
          progress: data.progress,
          status: data.status,
          currentStage: data.currentStage,
        })
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load project',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProject()

    return () => controller.abort()
  }, [projectId])

  if (isLoading) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading project...
        </div>
      </main>
    )
  }

  if (error || !project) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Project unavailable
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Project not found
          </h1>
          <p className="mt-2 text-slate-500">
            {error ?? 'The requested project could not be loaded.'}
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  const currentProject = project
  const displayedProject = isEditing && draft
    ? { ...currentProject, ...draft }
    : currentProject
  const currentStageIndex = PROJECT_STAGES.indexOf(displayedProject.currentStage)

  function updateDraft<Key extends keyof ProjectDraft>(
    field: Key,
    value: ProjectDraft[Key],
  ) {
    setDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  function startEditing() {
    setDraft({
      name: currentProject.name,
      customer: currentProject.customer,
      progress: currentProject.progress,
      status: currentProject.status,
      currentStage: currentProject.currentStage,
    })
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraft({
      name: currentProject.name,
      customer: currentProject.customer,
      progress: currentProject.progress,
      status: currentProject.status,
      currentStage: currentProject.currentStage,
    })
    setSaveError(null)
    setIsEditing(false)
  }

  async function saveChanges() {
    if (!projectId || !draft) return

    if (
      !draft.name.trim() ||
      !draft.customer.trim() ||
      !Number.isInteger(draft.progress) ||
      draft.progress < 0 ||
      draft.progress > 100
    ) {
      setSaveError('Name, customer, and a progress value from 0 to 100 are required.')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch(
        `http://localhost:5000/api/projects/${encodeURIComponent(projectId)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      )

      const data: { error?: string } & Partial<Project> = await response.json()
      if (!response.ok) {
        throw new Error(
          data.error ?? `Unable to save project (${response.status})`,
        )
      }

      const updatedProject = data as Project
      setProject(updatedProject)
      setDraft({
        name: updatedProject.name,
        customer: updatedProject.customer,
        progress: updatedProject.progress,
        status: updatedProject.status,
        currentStage: updatedProject.currentStage,
      })
      setIsEditing(false)
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save project',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="p-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
      >
        <span aria-hidden="true">←</span>
        <span className="ml-2">Back to Dashboard</span>
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Project details
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {displayedProject.name}
          </h1>
          <p className="mt-2 text-slate-500">{displayedProject.customer}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={displayedProject.status} />
          {!isEditing && canEdit && (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Edit project
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Project overview</h2>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Project ID</dt>
              <dd className="mt-1 font-semibold text-slate-900">{project.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Customer</dt>
              {isEditing && draft ? (
                <input
                  value={draft.customer}
                  onChange={(event) => updateDraft('customer', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              ) : (
                <dd className="mt-1 font-semibold text-slate-900">
                  {project.customer}
                </dd>
              )}
            </div>
          </dl>

          <div className="mt-8">
            {isEditing && draft && (
              <div className="mb-5">
                <label htmlFor="project-name" className="block text-sm font-medium text-slate-700">
                  Project Name
                </label>
                <input
                  id="project-name"
                  value={draft.name}
                  onChange={(event) => updateDraft('name', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            )}
            <label
              htmlFor="current-stage"
              className="block text-sm font-medium text-slate-700"
            >
              Current stage
            </label>
            <select
              id="current-stage"
              value={displayedProject.currentStage}
              disabled={!isEditing || !draft}
              onChange={(event) => {
                const selectedStage = PROJECT_STAGES.find(
                  (stage) => stage === event.target.value,
                )
                if (selectedStage) updateDraft('currentStage', selectedStage)
              }}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              {PROJECT_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage.charAt(0) + stage.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Overall progress</span>
              {isEditing && draft ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={draft.progress}
                  onChange={(event) =>
                    updateDraft('progress', Number(event.target.value))
                  }
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right font-semibold text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              ) : (
                <span className="font-semibold text-slate-900">
                  {project.progress}%
                </span>
              )}
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${displayedProject.progress}%` }}
              />
            </div>
          </div>

          {isEditing && draft && (
            <div className="mt-6">
              <label htmlFor="project-status" className="block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="project-status"
                value={draft.status}
                onChange={(event) =>
                  updateDraft('status', event.target.value as ProjectStatus)
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="ON_TRACK">On track</option>
                <option value="AT_RISK">At risk</option>
                <option value="DELAYED">Delayed</option>
              </select>
            </div>
          )}

          {isEditing && (
            <div className="mt-6 flex items-center justify-end gap-3">
              {saveError && (
                <p className="mr-auto text-sm text-red-600">{saveError}</p>
              )}
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveChanges}
                disabled={isSaving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Production workflow</h2>
          <div className="mt-6">
            {PROJECT_STAGES.map((stage, index) => {
              const isCompleted = index < currentStageIndex
              const isCurrent = index === currentStageIndex
              const label = stage.charAt(0) + stage.slice(1).toLowerCase()

              return (
              <div key={stage} className="flex items-center gap-3">
                <div className="flex w-5 flex-col items-center self-stretch">
                  <span
                    className={`h-3 w-3 rounded-full border-2 ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500'
                        : isCurrent
                          ? 'border-slate-900 bg-slate-900'
                          : 'border-slate-300 bg-white'
                    }`}
                  />
                  {index < PROJECT_STAGES.length - 1 && (
                    <span
                      className={`w-px flex-1 ${
                        index < currentStageIndex
                          ? 'bg-emerald-300'
                          : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`pb-4 text-sm ${
                    isCurrent
                      ? 'font-semibold text-slate-900'
                      : isCompleted
                        ? 'font-medium text-emerald-700'
                        : 'font-medium text-slate-500'
                  }`}
                >
                  {label}
                  {isCurrent && (
                    <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current
                    </span>
                  )}
                </span>
              </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

export default ProjectDetails
