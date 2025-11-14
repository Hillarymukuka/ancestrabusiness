import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

import ReceiptPreview from '../components/sales/ReceiptPreview.jsx'
import Card from '../components/layout/Card.jsx'
import api from '../utils/api.js'
import { PAYMENT_METHODS } from '../utils/paymentMethods.js'
import { formatCATDateTime, getTodayCATRange, getThisMonthCATRange } from '../utils/timezone.js'

const createLine = () => ({ product_id: '', quantity: 1 })
const defaultPaymentMethod = PAYMENT_METHODS[0]?.value ?? 'cash'

// TODO list entry (start)
const Sales = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [form, setForm] = useState({
    customer_name: '',
    payment_method: defaultPaymentMethod,
    items: []
  })

  // product picker state (search + selected)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)

  const [filters, setFilters] = useState({ start: '', end: '', customer: '' })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    loadProducts()
    // load sales after products; include 'mine' param automatically for cashiers
    loadSales()
    // Re-run when user changes (so cashiers immediately see their own history)
  }, [user])

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products/')
      setProducts(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load products')
    }
  }

  const loadSales = async (params = {}) => {
    setHistoryLoading(true)
    try {
      // If logged in user is a cashier, only request their own sales
      const p = { ...(params || {}) }
      if (user && user.role === 'cashier') p.mine = true
      const { data } = await api.get('/sales/', { params: p })
      setSales(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load sales history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return products
    return products.filter((p) => 
      p.name.toLowerCase().includes(term) || 
      (p.product_code && p.product_code.toLowerCase().includes(term))
    )
  }, [products, searchTerm])

  const addSelectedToSale = () => {
    if (!selectedProductId) {
      setError('Please select a product to add')
      return
    }
    if (Number(selectedQty) <= 0) {
      setError('Quantity must be greater than zero')
      return
    }

    // Check inventory levels
    const product = products.find((p) => p.id === Number(selectedProductId))
    if (!product) {
      setError('Product not found')
      return
    }

    // Calculate total quantity already in the sale
    const existingItem = form.items.find((i) => Number(i.product_id) === Number(selectedProductId))
    const currentQtyInSale = existingItem ? Number(existingItem.quantity) : 0
    const requestedTotal = currentQtyInSale + Number(selectedQty)

    if (requestedTotal > product.quantity) {
      const available = product.quantity - currentQtyInSale
      if (available <= 0) {
        setError(`Cannot add ${product.name}. No stock available (already ${currentQtyInSale} in sale, ${product.quantity} in inventory).`)
      } else {
        setError(`Inventory low for ${product.name}. Only ${available} units available (${product.quantity} in stock, ${currentQtyInSale} already in sale).`)
      }
      return
    }

    setError(null)
    setForm((prev) => {
      const existing = prev.items.find((i) => Number(i.product_id) === Number(selectedProductId))
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            Number(i.product_id) === Number(selectedProductId)
              ? { ...i, quantity: Number(i.quantity) + Number(selectedQty) }
              : i
          )
        }
      }
      return { ...prev, items: [...prev.items, { product_id: selectedProductId, quantity: Number(selectedQty) }] }
    })
    // reset picker
    setSelectedProductId('')
    setSelectedQty(1)
    setSearchTerm('')
  }

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  const total = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const prod = products.find((p) => p.id === Number(item.product_id))
      if (!prod) return sum
      return sum + prod.price * Number(item.quantity)
    }, 0)
  }, [form.items, products])

  const totalItems = form.items.reduce((s, it) => s + Number(it.quantity || 0), 0)

  const canSubmit = form.items.length > 0 && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        customer_name: form.customer_name,
        payment_method: form.payment_method,
        items: form.items.map((it) => ({ product_id: Number(it.product_id), quantity: Number(it.quantity) }))
      }
      const { data } = await api.post('/sales/', payload)
      setSuccess('Sale recorded successfully')
      setForm({ customer_name: '', payment_method: defaultPaymentMethod, items: [] })
      await Promise.all([loadProducts(), loadSales()])
      if (data?.id) {
        const { data: receiptData } = await api.get(`/sales/${data.id}/receipt`)
        setReceipt(receiptData)
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to create sale')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick filter helpers (small buttons on the side)
  const applyQuickFilter = async (type) => {
    if (type === 'today') {
      const { start, end } = getTodayCATRange()
      await loadSales({ start_date: start, end_date: end })
    }
    if (type === 'month') {
      const { start, end } = getThisMonthCATRange()
      await loadSales({ start_date: start, end_date: end })
    }
    if (type === 'all') {
      await loadSales()
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-primary">Smart sales</h1>
        <p className="text-sm text-slate-500">Traditional sale entry: pick product, add to sale, then complete transaction.</p>
        
        {success && (
          <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {error}
          </div>
        )}
      </header>

      <section className="space-y-4 sm:space-y-6">
        {/* Top row: Sale entry (left) and Receipt preview (right) */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <Card>
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Product search - full width */}
                <div className="w-full">
                  <label className="block text-xs sm:text-sm text-slate-600">Find product</label>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or product code..."
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:outline-none"
                  />

                  <div className="max-h-48 overflow-auto mt-2 rounded-md border border-slate-100 bg-white">
                    {filteredProducts.slice(0, 20).map((p) => (
                      <div
                        key={p.id}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${Number(selectedProductId) === p.id ? 'bg-primary/10 border-l-4 border-primary font-medium' : ''}`}
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedProductId(String(p.id))
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              {p.product_code ? `Code: ${p.product_code} | ` : ''}Stock: {p.quantity} 
                              {p.quantity <= p.reorder_level && (
                                <span className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle className="w-3 h-3" /> Low
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-500">ZMW {p.price.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                    {!filteredProducts.length && <div className="px-3 py-2 text-sm text-slate-400">No products</div>}
                  </div>
                </div>

                {/* Quantity and Add button - stacked on mobile, side by side on desktop */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center sm:items-end">
                  <div className="flex-1 sm:flex-none sm:w-32">
                    <label className="block text-xs sm:text-sm text-slate-600">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:outline-none"
                    />
                  </div>

                  <div className="flex-1 sm:flex-none sm:w-40">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        addSelectedToSale()
                      }}
                      className="w-full rounded-md bg-primary px-3 py-2.5 text-sm sm:text-base font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                      disabled={!selectedProductId}
                    >
                      Add to sale
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-700">Current sale</h3>
              {form.items.length === 0 ? (
                <p className="text-sm text-slate-500 mt-3 sm:mt-4">No items added yet.</p>
              ) : (
                <div className="mt-3 sm:mt-4 overflow-x-auto -mx-4 sm:mx-0">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="text-slate-600 text-xs uppercase">
                      <tr>
                        <th className="text-left px-2 py-2">Product</th>
                        <th className="px-2 py-2">Qty</th>
                        <th className="px-2 py-2">Price</th>
                        <th className="px-2 py-2">Subtotal</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => {
                        const prod = products.find((p) => p.id === Number(it.product_id))
                        return (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-2">{prod?.name ?? 'Unknown'}</td>
                            <td className="px-2 py-2">{it.quantity}</td>
                            <td className="px-2 py-2">ZMW {prod ? prod.price.toFixed(2) : '0.00'}</td>
                            <td className="px-2 py-2">ZMW {prod ? (prod.price * it.quantity).toFixed(2) : '0.00'}</td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" onClick={(e) => { e.preventDefault(); removeItem(idx); }} className="text-sm text-red-600">Remove</button>
                          </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-600">Items: {totalItems}</div>
                    <div className="text-lg font-semibold">Total: ZMW {total.toFixed(2)}</div>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Customer name (optional)"
                      value={form.customer_name}
                      onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                      className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base md:col-span-2"
                    />
                    <div className="md:col-span-1">
                      <select
                        value={form.payment_method}
                        onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3 flex flex-col sm:flex-row gap-2">
                      <button
                        type="submit"
                        disabled={!canSubmit || submitting}
                        title="Complete Sale"
                        className="w-full flex items-center justify-center gap-2 rounded-full bg-primary px-6 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-extrabold text-white shadow-2xl hover:bg-primary/95 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          'Processing...'
                        ) : (
                          <>
                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Complete Sale</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ customer_name: '', payment_method: defaultPaymentMethod, items: [] })}
                        className="rounded-md border px-4 py-2.5 text-sm sm:text-base whitespace-nowrap"
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Receipt preview (next to sale entry) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Receipt</h3>
            <Card>
              {receipt ? (
                <ReceiptPreview receipt={receipt} onClear={() => setReceipt(null)} />
              ) : (
                <div className="text-sm text-slate-500">Receipt preview will appear here after completing a sale.</div>
              )}
            </Card>
          </div>
        </div>

        {/* Bottom row: Sales history spanning full width */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold">Sales history</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => applyQuickFilter('today')} className="rounded-md border px-2 py-1 text-xs">Today</button>
              <button type="button" onClick={() => applyQuickFilter('month')} className="rounded-md border px-2 py-1 text-xs">This month</button>
              <button type="button" onClick={() => applyQuickFilter('all')} className="rounded-md border px-2 py-1 text-xs">All</button>
            </div>
          </div>

          <Card>
            {historyLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : sales.length === 0 ? (
              <div className="text-sm text-slate-500">No sales yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-slate-600 text-xs uppercase border-b">
                    <tr>
                      <th className="text-left px-3 py-2">Customer</th>
                      <th className="text-left px-3 py-2">Date/Time</th>
                      <th className="text-left px-3 py-2">Payment Method</th>
                      <th className="text-right px-3 py-2">Total Sale Amount</th>
                      <th className="text-center px-3 py-2">View Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">{s.customer_name || 'Walk-in'}</td>
                        <td className="px-3 py-2">{formatCATDateTime(s.created_at)}</td>
                        <td className="px-3 py-2 capitalize">{s.payment_method || 'N/A'}</td>
                        <td className="px-3 py-2 text-right">ZMW {s.total_amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault()
                              try {
                                const { data } = await api.get(`/sales/${s.id}/receipt`)
                                setReceipt(data)
                              } catch (err) {
                                setError(err?.response?.data?.detail || 'Unable to load receipt')
                              }
                            }}
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}

export default Sales
