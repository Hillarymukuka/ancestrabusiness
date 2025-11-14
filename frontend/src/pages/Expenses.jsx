import { useEffect, useState } from 'react'

import { useAuth } from '../context/AuthContext.jsx'
import api from '../utils/api.js'
import Card from '../components/layout/Card.jsx'
import { resolveMediaUrl } from '../utils/media.js'

const defaultExpense = {
  description: '',
  category: '',
  amount: '',
  expense_date: '',
  receipt: null
}

const Expenses = () => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [filters, setFilters] = useState({ start: '', end: '', category: '' })
  const [form, setForm] = useState({ ...defaultExpense })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const canManage = user?.role === 'owner' || user?.role === 'manager'
  const receiptFileName = form.receipt ? form.receipt.name : ''

  const formatCurrency = (value) =>
    `ZMW ${Number(value || 0).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`

  const loadExpenses = async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/expenses/', { params })
      setExpenses(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canManage) return
    try {
      const formData = new FormData()
      formData.append('description', form.description)
      formData.append('category', form.category)
      formData.append('amount', form.amount)
      formData.append('expense_date', form.expense_date)
      if (form.receipt) {
        formData.append('receipt', form.receipt)
      }
      await api.post('/expenses/', formData)
      setForm({ ...defaultExpense })
      loadExpenses(filters)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to add expense')
    }
  }

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0] || null
    setForm((prev) => ({ ...prev, receipt: file }))
  }

  const handleFilterSubmit = (event) => {
    event.preventDefault()
    const params = {}
    if (filters.start) params.start_date = filters.start
    if (filters.end) params.end_date = filters.end
    if (filters.category) params.category = filters.category
    loadExpenses(params)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-primary">Expenses</h2>
        <p className="text-sm text-slate-500">Track operational costs and suppliers</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {canManage ? (
        <Card title="Record expense" description="Log company spending with optional receipt uploads.">
          <form onSubmit={handleSubmit} className="grid gap-3 sm:gap-4 md:grid-cols-4">
            <input
              required
              type="text"
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none md:col-span-2"
            />
            <input
              required
              type="text"
              name="category"
              placeholder="Category"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
            />
            <input
              required
              type="number"
              step="0.01"
              name="amount"
              placeholder="Amount"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
            />
            <input
              required
              type="date"
              name="expense_date"
              value={form.expense_date}
              onChange={(event) => setForm((prev) => ({ ...prev, expense_date: event.target.value }))}
              className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
            />
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Receipt (optional)
              </label>
              <div className="mt-1 flex items-center gap-2 sm:gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base font-medium text-slate-600 hover:bg-slate-50">
                  <input
                    key={receiptFileName || 'empty'}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleReceiptChange}
                  />
                  Upload file
                </label>
                <span className="truncate text-xs text-slate-500 min-w-0">
                  {receiptFileName ? receiptFileName : 'No file chosen'}
                </span>
              </div>
            </div>
            <div className="md:col-span-4">
              <button
                type="submit"
                className="mt-2 rounded-md bg-primary px-4 py-2.5 text-sm sm:text-base font-semibold text-white hover:bg-primary/90"
              >
                Add expense
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Filters" description="Narrow down expenses by date range or category.">
        <form onSubmit={handleFilterSubmit} className="grid gap-2 sm:gap-3 md:grid-cols-4">
          <input
            type="date"
            value={filters.start}
            onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
          />
          <input
            type="date"
            value={filters.end}
            onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="Category"
            value={filters.category}
            onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2.5 text-sm sm:text-base font-semibold text-white hover:bg-accent/90"
          >
            Apply
          </button>
        </form>
      </Card>

      <Card title="Expense history" description="A detailed list of every recorded expense transaction.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr className="text-left">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length ? (
                expenses.map((expense) => {
                  const receiptUrl = resolveMediaUrl(expense.receipt_url)
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{expense.expense_date}</td>
                      <td className="px-4 py-3">{expense.category}</td>
                      <td className="px-4 py-3">{expense.description}</td>
                      <td className="px-4 py-3 font-semibold text-accent">{formatCurrency(expense.amount)}</td>
                      <td className="px-4 py-3">
                        {expense.receipt_url ? (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            View receipt
                          </a>
                        ) : (
                          <span className="text-xs uppercase tracking-widest text-slate-400">No receipt</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500">
                    No expenses found for the selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default Expenses
