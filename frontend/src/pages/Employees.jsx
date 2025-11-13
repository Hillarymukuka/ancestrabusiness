import { useEffect, useMemo, useState } from 'react'

import { Activity, Clock3, ShieldCheck, Trash2, TrendingUp, Users } from 'lucide-react'

import api from '../utils/api.js'
import { formatCATDateTime } from '../utils/timezone.js'

const SALES_RANGES = [
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'three_months', label: 'Past 3 months' },
  { value: 'all', label: 'All time' },
]

const ROLE_BADGE_CLASS = {
  owner: 'bg-slate-900 text-white',
  manager: 'bg-slate-700 text-white',
  cashier: 'bg-slate-200 text-slate-700'
}

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [salesRange, setSalesRange] = useState('week')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get('/employees/')
        setEmployees(data)
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load employee insights')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  const handleDelete = async (employeeId, employeeName) => {
    if (!confirm(`Are you sure you want to delete ${employeeName}? Their sales data will be preserved.`)) {
      return
    }

    setDeleting(employeeId)
    setError(null)

    try {
      await api.delete(`/employees/${employeeId}`)
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to delete employee')
    } finally {
      setDeleting(null)
    }
  }

  const rangeLabel = useMemo(
    () => SALES_RANGES.find((range) => range.value === salesRange)?.label ?? 'Last 7 days',
    [salesRange]
  )

  const formatCurrency = (value) =>
    `ZMW ${Number(value || 0).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const renderActivity = (activity) => (
    <div key={`${activity.action}-${activity.created_at}`} className="flex items-start gap-3">
      <div className="rounded-full bg-slate-100 p-1.5">
        <Activity className="h-4 w-4 text-slate-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-700">{activity.description}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">
          {formatCATDateTime(activity.created_at)}
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-slate-900">Team performance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor staff permissions, sales performance, and recent activity across your business.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sales view</label>
          <select
            value={salesRange}
            onChange={(event) => setSalesRange(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {SALES_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading employee insights…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{error}</div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No employees found yet. Invite team members from the settings page to start tracking activity.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {employees.map((employee) => {
            const roleBadgeClass = ROLE_BADGE_CLASS[employee.role] ?? 'bg-slate-200 text-slate-700'
            let selectedSales = { count: 0, amount: 0 }
            if (salesRange === 'all') {
              selectedSales = { count: employee.sales.total_count, amount: employee.sales.total_amount }
            } else {
              selectedSales = employee.sales[salesRange] ?? { count: 0, amount: 0 }
            }
            return (
              <div key={employee.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-slate-400" />
                      <h2 className="font-heading text-xl text-slate-900">{employee.full_name}</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">@{employee.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${roleBadgeClass}`}>
                      {employee.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(employee.id, employee.full_name)}
                      disabled={deleting === employee.id}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete employee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <TrendingUp className="h-4 w-4" />
                      {rangeLabel}
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{selectedSales.count}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Transactions</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">{formatCurrency(selectedSales.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-inner">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <Clock3 className="h-4 w-4" />
                      Lifetime sales
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{employee.sales.total_count}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Transactions</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      {formatCurrency(employee.sales.total_amount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-inner">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      <ShieldCheck className="h-4 w-4" />
                      Permissions
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-slate-600">
                      {employee.permissions.map((permission) => (
                        <li key={permission} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                          <span>{permission}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    <Activity className="h-4 w-4" />
                    Recent activity
                  </div>
                  {employee.recent_activity.length === 0 ? (
                    <p className="text-sm text-slate-400">No recorded changes yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {employee.recent_activity.map((activity) => renderActivity(activity))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Employees
