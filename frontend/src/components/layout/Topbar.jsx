import { useAuth } from '../../context/AuthContext.jsx'
import { User } from 'lucide-react'

const Topbar = () => {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 md:px-6 py-3 md:py-4 gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-base sm:text-lg md:text-xl text-primary truncate">
          Welcome{user ? `, ${user.full_name}` : ''}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Track your sales and inventory performance</p>
      </div>
      {user ? (
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Desktop view */}
          <div className="hidden md:flex items-center gap-3">
            <User className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">{user.full_name || user.username}</span>
          </div>
          
          {/* Role badge - hide text on mobile */}
          <span className="rounded-full bg-primary/10 px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-primary">
            <span className="hidden sm:inline">{user.role.toUpperCase()}</span>
            <span className="sm:hidden">{user.role.charAt(0).toUpperCase()}</span>
          </span>
          
          {/* Logout button - compact on mobile */}
          <button
            type="button"
            onClick={logout}
            className="rounded-md bg-accent px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-accent/90"
          >
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      ) : null}
    </header>
  )
}

export default Topbar