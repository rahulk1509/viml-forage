import { animate, createScope, stagger } from 'animejs'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import StatsCard from './StatsCard'
import ProjectTable from './ProjectTable'
import type { Project } from '../types/Project'
import { useAuth } from '../context/AuthContext'
import { hasAnyRole } from '../auth/permissions'

function Dashboard() {
  const { user } = useAuth()
  const root = useRef<HTMLDivElement>(null)
  const scope = useRef<ReturnType<typeof createScope> | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProjects() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('http://localhost:5000/api/projects', {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Unable to load projects (${response.status})`)
        }

        const data: unknown = await response.json()
        if (!Array.isArray(data)) {
          throw new Error('The projects API returned an invalid response')
        }

        setProjects(data as Project[])
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load projects',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProjects()

    return () => controller.abort()
  }, [])

  const activeProjectCount = projects.filter((project) => project.progress < 100).length
  const onTrackProjectCount = projects.filter(
    (project) => project.status === 'ON_TRACK',
  ).length
  const atRiskProjectCount = projects.filter(
    (project) => project.status === 'AT_RISK',
  ).length
  const delayedProjectCount = projects.filter(
    (project) => project.status === 'DELAYED',
  ).length

  useEffect(() => {
    if (!root.current) return

    scope.current = createScope({ root }).add(() => {
      animate('.stat-card', {
        opacity: [0, 1],
        y: [30, 0],
        duration: 700,
        delay: stagger(120),
        ease: 'out(4)',
      })
    })

    return () => scope.current?.revert()
  }, [])

  return (
    <main ref={root} className="p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Overview of manufacturing operations
          </p>
        </div>
        {hasAnyRole(user, 'ADMIN', 'PROJECT_MANAGER') && (
          <Link
            to="/projects/new"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            New Project
          </Link>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Projects"
          value={activeProjectCount}
          description="Currently active"
        />

        <StatsCard
          title="On Track"
          value={onTrackProjectCount}
          description="Projects progressing normally"
        />

        <StatsCard
          title="At Risk"
          value={atRiskProjectCount}
          description="Needs attention"
        />

        <StatsCard
          title="Delayed"
          value={delayedProjectCount}
          description="Past expected timeline"
        />
      </div>

      {isLoading && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading projects...
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!isLoading && !error && <ProjectTable projects={projects} />}
    </main>
  )
}

export default Dashboard