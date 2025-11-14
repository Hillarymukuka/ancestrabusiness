const toneMap = {
  primary: 'text-slate-900',
  accent: 'text-accent',
  neutral: 'text-slate-600'
}

const SummaryCard = ({ title, value, description, icon: Icon, tone = 'primary' }) => {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 md:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 truncate">{title}</p>
          <p className={`mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold ${toneMap[tone] ?? toneMap.primary} break-words`}>
            {value}
          </p>
          {description ? <p className="mt-0.5 sm:mt-1 text-xs text-slate-400 hidden sm:block">{description}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-full bg-slate-100 p-1.5 sm:p-2 text-slate-500 flex-shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SummaryCard
