import { animate, createScope } from 'animejs'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../types/Project'
import StatusBadge from './StatusBadge'

type ProjectTableProps = {
  projects: Project[]
}

function ProjectTable({ projects }: ProjectTableProps) {
  const root = useRef<HTMLDivElement>(null)
  const scope = useRef<ReturnType<typeof createScope> | null>(null)
  const progressBarRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    if (!root.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion) {
      projects.forEach((project, index) => {
        const bar = progressBarRefs.current[index]
        if (bar) bar.style.width = `${project.progress}%`
      })
      return
    }

    scope.current = createScope({ root }).add(() => {
      projects.forEach((project, index) => {
        const bar = progressBarRefs.current[index]
        if (!bar) return

        animate(bar, {
          width: ['0%', `${project.progress}%`],
          duration: 850,
          delay: index * 100,
          ease: 'out(3)',
        })
      })
    })

    return () => scope.current?.revert()
  }, [projects])

  return (
    <div ref={root} className="mt-8 overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold text-slate-900">
          Active Projects
        </h2>
      </div>

      <div className="divide-y">
        {projects.map((project, index) => (
          <div
            key={project.id}
            className="grid grid-cols-4 items-center gap-4 px-6 py-5"
          >
            <div>
              <Link
                to={`/projects/${project.id}`}
                className="font-medium text-slate-900 transition-colors hover:text-slate-600"
              >
                {project.name}
              </Link>

              <p className="text-sm text-slate-500">
                {project.customer}
              </p>
            </div>

            <div className="col-span-2">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-500">
                  Progress
                </span>

                <span className="font-medium">
                  {project.progress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  ref={(element) => {
                    progressBarRefs.current[index] = element
                  }}
                  className="project-progress-bar h-full rounded-full bg-slate-900"
                  style={{ width: '0%' }}
                />
              </div>
            </div>

            <div className="text-right">
              <StatusBadge status={project.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProjectTable