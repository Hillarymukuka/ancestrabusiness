import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import { useDashboard } from '../context/DashboardContext.jsx'
import api from '../utils/api.js'
import { formatCATShort } from '../utils/timezone.js'

const Currency = ({ value }) => (
  <span>
    ZMW {value.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </span>
)

const Reports = () => {
  const { summary, refresh } = useDashboard()

  // Chart data and options
  const salesVsExpensesChart = useMemo(() => {
    if (!summary?.sales_vs_expenses) return null

    const sortedData = [...summary.sales_vs_expenses].reverse().slice(0, 7)
    
    return {
      series: [
        {
          name: 'Sales',
          data: sortedData.map(d => d.sales)
        },
        {
          name: 'Expenses',
          data: sortedData.map(d => d.expenses)
        },
        {
          name: 'Profit',
          data: sortedData.map(d => d.profit)
        }
      ],
      options: {
        chart: {
          type: 'bar',
          height: 320,
          toolbar: {
            show: false
          }
        },
        colors: ['#3b0270', '#ff4e00', '#10b981'],
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '75%',
            borderRadius: 4
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          show: true,
          width: 2,
          colors: ['transparent']
        },
        xaxis: {
          categories: sortedData.map(d => formatCATShort(d.period)),
          labels: {
            style: {
              colors: '#64748b',
              fontSize: '10px'
            }
          }
        },
        yaxis: {
          labels: {
            formatter: (value) => `${value.toFixed(0)}`,
            style: {
              colors: '#64748b',
              fontSize: '10px'
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'center',
          labels: {
            colors: '#334155'
          },
          fontSize: '11px'
        },
        grid: {
          borderColor: '#e2e8f0',
          strokeDashArray: 4
        },
        tooltip: {
          y: {
            formatter: (value) => `ZMW ${value.toFixed(2)}`
          }
        }
      }
    }
  }, [summary])

  const salesByUserChart = useMemo(() => {
    if (!summary?.sales_by_user) return null

    const activeUsers = summary.sales_by_user.filter(u => !u.is_deleted).slice(0, 5)
    
    return {
      series: activeUsers.map(u => u.total_sales),
      options: {
        chart: {
          type: 'polarArea',
          height: 380
        },
        colors: ['#3b0270', '#ff4e00', '#10b981', '#f59e0b', '#06b6d4'],
        labels: activeUsers.map(u => u.user_name),
        fill: {
          opacity: 0.85
        },
        stroke: {
          width: 2,
          colors: ['#fff']
        },
        legend: {
          position: 'bottom',
          labels: {
            colors: '#334155'
          }
        },
        plotOptions: {
          polarArea: {
            rings: {
              strokeWidth: 1,
              strokeColor: '#e2e8f0'
            },
            spokes: {
              strokeWidth: 1,
              connectorColors: '#e2e8f0'
            }
          }
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(0)}%`
        },
        tooltip: {
          y: {
            formatter: (value) => `ZMW ${value.toFixed(2)}`
          }
        },
        yaxis: {
          labels: {
            formatter: (value) => `ZMW ${value.toFixed(0)}`
          }
        }
      }
    }
  }, [summary])

  const periodSummaryChart = useMemo(() => {
    if (!summary?.period_summaries) return null

    // Find the current period (usually "This Month" or last period)
    const currentPeriod = summary.period_summaries[summary.period_summaries.length - 1]

    return {
      series: [currentPeriod.sales, currentPeriod.expenses],
      options: {
        chart: {
          type: 'donut',
          height: 320
        },
        colors: ['#3b0270', '#ff4e00'],
        labels: ['Sales', 'Expenses'],
        legend: {
          position: 'bottom',
          labels: {
            colors: '#334155'
          }
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(1)}%`
        },
        plotOptions: {
          pie: {
            donut: {
              size: '65%',
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '16px',
                  color: '#334155'
                },
                value: {
                  show: true,
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#3b0270',
                  formatter: (val) => `ZMW ${parseFloat(val).toFixed(0)}`
                },
                total: {
                  show: true,
                  label: 'Total Revenue',
                  fontSize: '14px',
                  color: '#64748b',
                  formatter: () => `ZMW ${(currentPeriod.sales + currentPeriod.expenses).toFixed(0)}`
                }
              }
            }
          }
        },
        tooltip: {
          y: {
            formatter: (value) => `ZMW ${value.toFixed(2)}`
          }
        }
      }
    }
  }, [summary])

  const handleExport = async () => {
    try {
      const response = await api.get('/reports/export', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ancestra_report_${new Date().toISOString().slice(0,10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Unable to export PDF. Make sure you are logged in and the server supports PDF export.')
    }
  }

  if (!summary) {
    return <p className="text-sm text-slate-500">No report data. Capture sales and expenses to view summaries.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-primary">Financial Reports</h2>
          <p className="text-sm text-slate-500">Daily, weekly and monthly performance</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summary.period_summaries.map((period) => (
          <div key={period.label} className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{period.label}</p>
            <p className="mt-3 text-sm text-slate-600">Sales: <Currency value={period.sales} /></p>
            <p className="text-sm text-slate-600">Expenses: <Currency value={period.expenses} /></p>
            <p className="mt-2 text-lg font-semibold text-primary">Profit: <Currency value={period.profit} /></p>
          </div>
        ))}
      </div>

      {/* Three Charts in One Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Period Summary Chart */}
        {periodSummaryChart && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Current Period Breakdown</h3>
            <p className="text-sm text-slate-500 mb-4">Sales vs Expenses distribution</p>
            <Chart
              options={periodSummaryChart.options}
              series={periodSummaryChart.series}
              type="donut"
              height={320}
            />
          </div>
        )}

        {/* Sales vs Expenses Chart */}
        {salesVsExpensesChart && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sales, Expenses & Profit Trend</h3>
            <p className="text-sm text-slate-500 mb-4">Last 7 days performance</p>
            <Chart
              options={salesVsExpensesChart.options}
              series={salesVsExpensesChart.series}
              type="bar"
              height={320}
            />
          </div>
        )}

        {/* Sales by User Chart */}
        {salesByUserChart && summary.sales_by_user && summary.sales_by_user.length > 0 && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Top 5 Sales Performers</h3>
            <p className="text-sm text-slate-500 mb-4">Performance comparison by team member</p>
            <Chart
              options={salesByUserChart.options}
              series={salesByUserChart.series}
              type="polarArea"
              height={320}
            />
          </div>
        )}
      </div>

      {/* Sales by User Table (Latest first - sorted by total sales) */}
      {summary.sales_by_user && summary.sales_by_user.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Sales by User</h3>
            <p className="text-sm text-slate-500">Top performers and deleted user records</p>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr className="text-left">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Transactions</th>
                <th className="px-4 py-3">Total Sales</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {summary.sales_by_user.map((user, idx) => (
                <tr key={user.user_id || `deleted-${idx}`} className={user.is_deleted ? 'bg-slate-50/50' : ''}>
                  <td className="px-4 py-3">
                    <span className={user.is_deleted ? 'text-slate-400 italic' : 'text-slate-900 font-medium'}>
                      {user.user_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.total_transactions}</td>
                  <td className="px-4 py-3 font-semibold">
                    <Currency value={user.total_sales} />
                  </td>
                  <td className="px-4 py-3">
                    {user.is_deleted ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                        Deleted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sales vs Expenses - Reversed to show latest first */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Daily Sales vs Expenses</h3>
          <p className="text-sm text-slate-500">Latest transactions first</p>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr className="text-left">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Expenses</th>
              <th className="px-4 py-3">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {[...summary.sales_vs_expenses].reverse().map((point) => (
              <tr key={point.period}>
                <td className="px-4 py-3 text-slate-600">{formatCATShort(point.period)}</td>
                <td className="px-4 py-3">ZMW {point.sales.toFixed(2)}</td>
                <td className="px-4 py-3">ZMW {point.expenses.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-primary">ZMW {point.profit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Reports