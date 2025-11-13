const toneMap = {
  primary: 'text-slate-900',
  accent: 'text-accent',
  neutral: 'text-slate-600'
}

const SummaryCard = ({ title, value, description, icon: Icon, tone = 'primary' }) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
          <p className={`mt-2 text-2xl font-semibold ${toneMap[tone] ?? toneMap.primary}`}>{value}</p>
          {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-full bg-slate-100 p-2 text-slate-500">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SummaryCard
