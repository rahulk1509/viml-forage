type SectionPlaceholderProps = {
  title: string
}

function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <main className="p-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          VMIL Forge
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-xl text-slate-500">
          This workspace is ready for the {title.toLowerCase()} module.
          Detailed functionality will be added in a future release.
        </p>
      </div>
    </main>
  )
}

export default SectionPlaceholder
