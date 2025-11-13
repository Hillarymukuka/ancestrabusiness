import { CalendarDays, CreditCard, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react'

import BestSellersTable from '../components/dashboard/BestSellersTable.jsx'
import LowStockList from '../components/dashboard/LowStockList.jsx'
import SummaryCard from '../components/dashboard/SummaryCard.jsx'
import TrendChart from '../components/dashboard/TrendChart.jsx'
import { useDashboard } from '../context/DashboardContext.jsx'

const formatCurrency = (value) =>
  `ZMW ${Number(value || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

const Dashboard = () => {
  const { summary, loading, error } = useDashboard()

  if (loading) {
    return <p className="text-sm text-slate-500">Loading dashboard...</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!summary) {
    return <p className="text-sm text-slate-500">No data yet. Create your first records to see insights.</p>
  }

  const metricCards = [
    {
      title: 'Revenue',
      value: formatCurrency(summary.total_sales),
      description: 'All-time sales volume',
      icon: DollarSign,
      tone: 'primary'
    },
    {
      title: 'Expenses',
      value: formatCurrency(summary.total_expenses),
      description: 'Total operational spend',
      icon: CreditCard,
      tone: 'accent'
    },
    {
      title: 'Net profit',
      value: formatCurrency(summary.total_profit),
      description: 'Revenue minus expenses',
      icon: TrendingUp,
      tone: 'primary'
    },
    {
      title: 'Orders',
      value: summary.total_orders.toLocaleString(),
      description: 'Completed sales to date',
      icon: ShoppingBag,
      tone: 'primary'
    },
    {
      title: 'Sales today',
      value: formatCurrency(summary.sales_today),
      description: 'Recorded since midnight',
      icon: CalendarDays,
      tone: 'primary'
    }
  ]

  const quickStats = [
    { label: 'Sales today', value: formatCurrency(summary.sales_today) },
    { label: 'Total orders', value: summary.total_orders.toLocaleString() },
    { label: 'Low stock items', value: summary.low_stock.length }
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-5">
        {metricCards.map((card) => (
          <SummaryCard
            key={card.title}
            title={card.title}
            value={card.value}
            description={card.description}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <TrendChart points={summary.sales_vs_expenses} className="xl:col-span-2" height={240} />
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="font-heading text-lg text-slate-900">Today&apos;s snapshot</h3>
            <div className="mt-4 space-y-3">
              {quickStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between text-sm text-slate-600">
                  <span className="text-slate-500">{stat.label}</span>
                  <span className="font-semibold text-slate-900">{stat.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {summary.period_summaries.map((period) => (
                <div key={period.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{period.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{formatCurrency(period.profit)}</p>
                  <p className="text-xs text-slate-400">Profit</p>
                </div>
              ))}
            </div>
          </div>
          <LowStockList className="flex-1" items={summary.low_stock} />
        </div>
      </section>

      <section>
        <BestSellersTable products={summary.best_sellers} />
      </section>
    </div>
  )
}

export default Dashboard
