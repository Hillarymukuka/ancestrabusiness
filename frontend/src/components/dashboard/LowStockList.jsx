const parseLowStockItem = (item) => {
  const match = item.match(/^(.*)\s\(([-\d]+)\)$/)
  if (!match) {
    return { name: item, quantity: '' }
  }
  return {
    name: match[1].trim(),
    quantity: Number(match[2])
  }
}

const LowStockList = ({ items = [], className = '' }) => {
  const parsedItems = items.map(parseLowStockItem)

  if (!parsedItems.length) {
    return (
      <div className={`rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm ${className}`}>
        <h3 className="font-heading text-base sm:text-lg text-slate-900">Low stock alerts</h3>
        <p className="mt-3 text-sm text-slate-500">All products are above reorder levels.</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base sm:text-lg text-slate-900">Low stock alerts</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">Products nearing reorder threshold</p>
        </div>
      </div>
      <ul className="mt-4 sm:mt-5 space-y-2 sm:space-y-3">
        {parsedItems.map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between rounded-lg sm:rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-700 truncate">{item.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">On hand: {item.quantity}</p>
            </div>
            <span className="ml-2 flex-shrink-0 rounded-full bg-accent/10 px-2.5 sm:px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
              Reorder
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LowStockList
