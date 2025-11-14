const Card = ({ title, description, actions, className = '', contentClassName = '', children }) => {
  const hasHeader = title || description || actions

  return (
    <div className={`rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm ${className}`}>
      {hasHeader ? (
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h3 className="font-heading text-base sm:text-lg text-slate-900">{title}</h3> : null}
            {description ? <p className="mt-1 text-xs sm:text-sm text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex w-full justify-start gap-2 sm:gap-3 sm:w-auto sm:justify-end flex-wrap">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`${hasHeader ? 'mt-4 sm:mt-5' : ''} ${contentClassName}`}>{children}</div>
    </div>
  )
}

export default Card
