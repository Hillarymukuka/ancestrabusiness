import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, Boxes, ChevronLeft, ChevronRight, FileText, Home, Settings, ShoppingBag, Users, Wallet } from 'lucide-react'
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
  const navRef = useRef(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // For cashiers, hide management routes
  const hiddenForCashier = new Set(['Dashboard', 'Settings', 'Reports', 'Expenses', 'Employees'])
  const itemsToShow = user && user.role === 'cashier' ? navItems.filter((i) => !hiddenForCashier.has(i.label)) : navItems

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    const nav = navRef.current
    if (nav) {
      checkScroll()
      nav.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
      
      return () => {
        nav.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [itemsToShow])

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 bg-primary text-white flex-col sticky top-0 h-screen">
        {/* Header */}
        <div className="px-6 py-8 border-b border-white/10">
          <h1 className="font-heading text-2xl">Ancestra</h1>
          <p className="text-sm text-white/80">Business Manager</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {itemsToShow.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2 font-medium transition ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* Footer branding */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/60 text-center leading-tight">
            Built by Ancestro
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navbar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-primary text-white border-t border-white/10 z-50">
        <div className="relative">
          {/* Left scroll indicator */}
          {showLeftArrow && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-primary to-transparent z-10 flex items-center justify-start pointer-events-none">
              <ChevronLeft className="h-5 w-5 text-white animate-pulse" />
            </div>
          )}
          
          {/* Right scroll indicator */}
          {showRightArrow && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-primary to-transparent z-10 flex items-center justify-end pointer-events-none">
              <ChevronRight className="h-5 w-5 text-white animate-pulse" />
            </div>
          )}
          
          {/* Scrollable nav items */}
          <div 
            ref={navRef}
            className="flex items-center justify-start min-[480px]:justify-around px-1 py-2 safe-area-bottom gap-0.5 overflow-x-auto scrollbar-hide"
          >
            {itemsToShow.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-1.5 min-[380px]:px-2 py-1.5 rounded-lg transition min-w-[44px] flex-shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'text-white/80'
                  }`
                }
                title={item.label}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-[9px] font-medium leading-tight hidden min-[380px]:block whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}

export default Sidebar
