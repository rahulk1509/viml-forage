type StatsCardProps = {
  title: string
  value: number
  description: string
}

function StatsCard({ title, value, description }: StatsCardProps) {
  return (
    <div className="stat-card rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  )
}

export default StatsCard