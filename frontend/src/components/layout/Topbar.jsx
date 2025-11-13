import { useAuth } from '../../context/AuthContext.jsx'
import { User } from 'lucide-react'

const Topbar = () => {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h2 className="font-heading text-xl text-primary">Welcome back{user ? `, ${user.full_name}` : ''}</h2>
        <p className="text-sm text-slate-500">Track your sales and inventory performance</p>
      </div>
      {user ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">{user.full_name || user.username}</span>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {user.role.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-accent/90"
          >
            Logout
          </button>
        </div>
      ) : null}
    </header>
  )
}

export default Topbar