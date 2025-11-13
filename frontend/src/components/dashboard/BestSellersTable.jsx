const formatCurrency = (value) =>
  `ZMW ${Number(value || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

const BestSellersTable = ({ products = [] }) => {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="font-heading text-lg text-slate-900">Best selling items</h3>
        <p className="mt-2 text-sm text-slate-500">Sales data will appear here once products are sold.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-lg text-slate-900">Best selling items</h3>
          <p className="text-sm text-slate-500">Top performers ranked by quantity sold</p>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm text-slate-600">
          <thead className="text-left text-xs font-semibold uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Sold</th>
              <th className="px-3 py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={product.product_id} className="border-t border-slate-100">
                <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-800">{product.product_name}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(product.unit_price)}</p>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                      product.status === 'In stock'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {product.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-800">{product.total_quantity}</td>
                <td className="px-3 py-3 text-right font-semibold text-slate-800">
                  {formatCurrency(product.total_revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BestSellersTable
