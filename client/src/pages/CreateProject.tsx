import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PROJECT_STAGES,
  type ProjectStage,
  type ProjectStatus,
} from '../types/Project'

type ProjectForm = {
  id: string
  name: string
  customer: string
  progress: string
  status: ProjectStatus
  currentStage: ProjectStage
}

const initialForm: ProjectForm = {
  id: '',
  name: '',
  customer: '',
  progress: '0',
  status: 'ON_TRACK',
  currentStage: 'RFQ',
}

const statuses: ProjectStatus[] = ['ON_TRACK', 'AT_RISK', 'DELAYED']

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function CreateProject() {
  const navigate = useNavigate()
  const [form, setForm] = useState<ProjectForm>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField<Key extends keyof ProjectForm>(
    field: Key,
    value: ProjectForm[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function validateForm() {
    if (!form.id.trim() || !form.name.trim() || !form.customer.trim()) {
      return 'Project ID, project name, and customer are required.'
    }

    const progress = Number(form.progress)
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      return 'Progress must be an integer between 0 and 100.'
    }

    if (!statuses.includes(form.status)) {
      return 'Select a valid project status.'
    }

    if (!PROJECT_STAGES.includes(form.currentStage)) {
      return 'Select a valid current stage.'
    }

    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: form.id.trim(),
          name: form.name.trim(),
          customer: form.customer.trim(),
          progress: Number(form.progress),
        }),
      })

      if (!response.ok) {
        let message = `Unable to create project (${response.status})`
        try {
          const data: { error?: string } = await response.json()
          if (data.error) message = data.error
        } catch {
          // Keep the status-based message when the API does not return JSON.
        }
        throw new Error(message)
      }

      const createdProject: { id: string } = await response.json()
      navigate(`/projects/${encodeURIComponent(createdProject.id)}`)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create project',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="p-8">
      <Link
        to="/dashboard"
        className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
      >
        <span aria-hidden="true">←</span>
        <span className="ml-2">Back to Dashboard</span>
      </Link>

      <div className="mt-6 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Project administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Create project
        </h1>
        <p className="mt-2 text-slate-500">
          Add a new project to the VMIL Forge production register.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Project ID
            <input
              required
              value={form.id}
              onChange={(event) => updateField('id', event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Project Name
            <input
              required
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Customer
            <input
              required
              value={form.customer}
              onChange={(event) => updateField('customer', event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Progress
            <input
              required
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.progress}
              onChange={(event) => updateField('progress', event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                updateField('status', event.target.value as ProjectStatus)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Current Stage
            <select
              value={form.currentStage}
              onChange={(event) =>
                updateField('currentStage', event.target.value as ProjectStage)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              {PROJECT_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {formatLabel(stage)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating project...' : 'Create project'}
          </button>
        </div>
      </form>
    </main>
  )
}

export default CreateProject
