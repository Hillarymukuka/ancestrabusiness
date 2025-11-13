import { NavLink } from 'react-router-dom'
import { BarChart3, Boxes, FileText, Home, Settings, ShoppingBag, Users, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/inventory', label: 'Stock', icon: Boxes },
  { to: '/sales', label: 'Sales', icon: ShoppingBag },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings }
]

const Sidebar = () => {
  const { user } = useAuth()

  // For cashiers, hide management routes
  const hiddenForCashier = new Set(['Dashboard', 'Settings', 'Reports', 'Expenses', 'Employees'])
  const itemsToShow = user && user.role === 'cashier' ? navItems.filter((i) => !hiddenForCashier.has(i.label)) : navItems

  return (
    <aside className="w-20 lg:w-64 bg-primary text-white flex flex-col">
      {/* Header: show icon only on mobile, full text on desktop */}
      <div className="px-3 lg:px-6 py-8 border-b border-white/10">
        <h1 className="font-heading text-2xl hidden lg:block">Ancestra</h1>
        <p className="text-sm text-white/80 hidden lg:block">Business Manager</p>
        {/* Mobile: show just first letter or icon */}
        <div className="lg:hidden flex items-center justify-center">
          <span className="font-heading text-2xl font-bold">A</span>
        </div>
      </div>
      <nav className="flex-1 px-2 lg:px-4 py-6 space-y-1">
        {itemsToShow.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-2 lg:px-4 py-2 font-medium transition justify-center lg:justify-start ${
                isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
              }`
            }
            title={item.label}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
