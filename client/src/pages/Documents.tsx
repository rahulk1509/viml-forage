import { useEffect, useMemo, useState } from 'react'
import { hasAnyRole } from '../auth/permissions'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config/api'

type DocumentStatus = 'ACTIVE' | 'SUPERSEDED'
type DocumentRecord = {
  id: string
  projectId: string
  name: string
  documentNumber: string
  revision: string
  documentType: string
  status: DocumentStatus
  description: string | null
  updatedAt: string
  project: { id: string; name: string }
}
type ProjectOption = { id: string; name: string }

const statusStyles: Record<DocumentStatus, { label: string; dot: string; text: string; background: string }> = {
  ACTIVE: { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700', background: 'bg-emerald-50' },
  SUPERSEDED: { label: 'Superseded', dot: 'bg-slate-400', text: 'text-slate-600', background: 'bg-slate-100' },
}

function isDocument(value: unknown): value is DocumentRecord {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  const project = item.project as Record<string, unknown> | undefined
  return typeof item.id === 'string' && typeof item.projectId === 'string' &&
    typeof item.name === 'string' && typeof item.documentNumber === 'string' &&
    typeof item.revision === 'string' && typeof item.documentType === 'string' &&
    typeof item.status === 'string' && item.status in statusStyles &&
    (item.description === null || typeof item.description === 'string') &&
    typeof item.updatedAt === 'string' && !!project &&
    typeof project.id === 'string' && typeof project.name === 'string'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const style = statusStyles[status]
  return <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.background} ${style.text}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{style.label}
  </span>
}

function Documents() {
  const { user } = useAuth()
  const canCreate = hasAnyRole(user, 'ADMIN', 'PROJECT_MANAGER')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedProject, setSelectedProject] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | DocumentStatus>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    projectId: '', name: '', documentNumber: '', revision: '', documentType: 'DRAWING',
    status: 'ACTIVE' as DocumentStatus, description: '',
  })

  async function loadData(signal?: AbortSignal) {
    const [documentResponse, projectResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/documents`, { credentials: 'include', signal }),
      fetch(`${API_BASE_URL}/api/projects`, { credentials: 'include', signal }),
    ])
    if (!documentResponse.ok) throw new Error(`Unable to load documents (${documentResponse.status})`)
    if (!projectResponse.ok) throw new Error(`Unable to load projects (${projectResponse.status})`)
    const documentData: unknown = await documentResponse.json()
    const projectData: unknown = await projectResponse.json()
    if (!Array.isArray(documentData) || !documentData.every(isDocument)) {
      throw new Error('The documents API returned an invalid response')
    }
    if (!Array.isArray(projectData)) throw new Error('The projects API returned an invalid response')
    setDocuments(documentData)
    setProjects(projectData.filter((item): item is ProjectOption =>
      !!item && typeof item === 'object' &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).name === 'string',
    ))
  }

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    loadData(controller.signal).catch((requestError) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      setError(requestError instanceof Error ? requestError.message : 'Unable to load documents')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [])

  const filteredDocuments = useMemo(() => documents.filter((document) =>
    (selectedProject === 'ALL' || document.projectId === selectedProject) &&
    (selectedStatus === 'ALL' || document.status === selectedStatus),
  ), [documents, selectedProject, selectedStatus])

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  async function submitDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.projectId || !form.name.trim() || !form.documentNumber.trim() || !form.revision.trim() || !form.documentType.trim()) {
      setFormError('Project, name, document number, revision, type, and status are required.')
      return
    }
    setIsSubmitting(true)
    setFormError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          documentNumber: form.documentNumber.trim(),
          revision: form.revision.trim(),
          documentType: form.documentType.trim(),
          description: form.description.trim() || undefined,
        }),
      })
      if (!response.ok) {
        let message = `Unable to create document (${response.status})`
        try {
          const body: { error?: string } = await response.json()
          if (body.error) message = body.error
        } catch { /* Preserve the status message for non-JSON responses. */ }
        throw new Error(message)
      }
      await loadData()
      setIsModalOpen(false)
      setForm({ projectId: '', name: '', documentNumber: '', revision: '', documentType: 'DRAWING', status: 'ACTIVE', description: '' })
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : 'Unable to create document')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <main className="p-8"><div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading documents...</div></main>
  if (error) return <main className="p-8"><div className="rounded-xl border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm"><h1 className="font-bold text-red-900">Documents unavailable</h1><p className="mt-2">{error}</p></div></main>

  return <main className="p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Engineering records</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Documents</h1><p className="mt-2 text-slate-500">Track current drawing and document revisions by project.</p></div>
      {canCreate && <button type="button" onClick={() => { setFormError(null); setIsModalOpen(true) }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">New Document</button>}
    </div>
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        ['Total Documents', documents.length, 'text-slate-900'],
        ['Active', documents.filter((item) => item.status === 'ACTIVE').length, 'text-emerald-700'],
        ['Superseded', documents.filter((item) => item.status === 'SUPERSEDED').length, 'text-slate-600'],
      ].map(([label, value, tone]) => <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p></div>)}
    </div>
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
      <label className="text-sm font-semibold text-slate-700">Project<select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="ALL">All Projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.id}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Status<select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'ALL' | DocumentStatus)} className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="ALL">All Statuses</option><option value="ACTIVE">Active</option><option value="SUPERSEDED">Superseded</option></select></label>
    </div>
    {filteredDocuments.length === 0 ? <div className="mt-4 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">No documents match the selected filters.</div> : <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left"><thead className="border-b border-slate-200 bg-slate-50"><tr className="text-xs font-semibold uppercase tracking-wide text-slate-500"><th className="whitespace-nowrap px-6 py-4">Document Number</th><th className="whitespace-nowrap px-6 py-4">Document Name</th><th className="whitespace-nowrap px-6 py-4">Project</th><th className="whitespace-nowrap px-6 py-4">Type</th><th className="whitespace-nowrap px-6 py-4">Revision</th><th className="whitespace-nowrap px-6 py-4">Status</th><th className="whitespace-nowrap px-6 py-4">Updated At</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredDocuments.map((document) => <tr key={document.id} className="text-sm text-slate-700"><td className="whitespace-nowrap px-6 py-5 font-semibold text-slate-900">{document.documentNumber}</td><td className="whitespace-nowrap px-6 py-5">{document.name}</td><td className="whitespace-nowrap px-6 py-5"><p className="font-semibold">{document.project.id}</p><p className="mt-1 text-xs text-slate-500">{document.project.name}</p></td><td className="whitespace-nowrap px-6 py-5">{document.documentType}</td><td className="whitespace-nowrap px-6 py-5 font-semibold">{document.revision}</td><td className="whitespace-nowrap px-6 py-5"><StatusBadge status={document.status} /></td><td className="whitespace-nowrap px-6 py-5">{formatDate(document.updatedAt)}</td></tr>)}</tbody></table></div></div>}
    {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8"><div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Engineering records</p><h2 className="mt-2 text-2xl font-bold text-slate-900">New document</h2></div><button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Close</button></div><form onSubmit={submitDocument} className="mt-6 space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Project<select required value={form.projectId} onChange={(event) => setField('projectId', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.id} — {project.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Document Name<input required value={form.name} onChange={(event) => setField('name', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Document Number<input required value={form.documentNumber} onChange={(event) => setField('documentNumber', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Revision<input required value={form.revision} onChange={(event) => setField('revision', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Document Type<input required value={form.documentType} onChange={(event) => setField('documentType', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Status<select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ACTIVE">Active</option><option value="SUPERSEDED">Superseded</option></select></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea rows={3} value={form.description} onChange={(event) => setField('description', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>{formError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? 'Saving...' : 'Create Document'}</button></div></form></div></div>}
  </main>
}

export default Documents
