import type { ProjectStatus } from '../types/Project'

type StatusBadgeProps = {
  status: ProjectStatus
}

const statusStyles: Record<
  ProjectStatus,
  { label: string; badge: string; dot: string }
> = {
  ON_TRACK: {
    label: 'On track',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
  AT_RISK: {
    label: 'At risk',
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dot: 'bg-amber-500',
  },
  DELAYED: {
    label: 'Delayed',
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
    dot: 'bg-red-500',
  },
}

function StatusBadge({ status }: StatusBadgeProps) {
  const { label, badge, dot } = statusStyles[status]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  )
}

export default StatusBadge
