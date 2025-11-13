import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

import { useAuth } from '../context/AuthContext.jsx'

const Login = () => {
  const { user, login, loading, error } = useAuth()
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await login(credentials.username, credentials.password)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3b0270] via-[#6f00ff] to-[#3b0270] px-4 py-12">
      <div className="container mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Welcome Section */}
          <div className="text-center lg:text-left space-y-6">
            <div className="space-y-4">
              <h1 className="font-heading text-5xl lg:text-6xl font-bold text-white leading-tight">
                Welcome to<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white">
                  Ancestra Business
                </span>
              </h1>
              <p className="text-xl text-purple-100 max-w-xl">
                Your simple way to manage sales, stock and reports — all in one place.
              </p>
            </div>
            
            {/* Image (uses image.jpg at project root) */}
            <div className="mt-8 rounded-2xl overflow-hidden ring-1 ring-white/20 aspect-video bg-white/5">
              {/* Use a root-relative URL so Vite serves the file at /image.jpg when running dev server */}
              <img src="/image.jpg" alt="Dashboard preview" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Login Card */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-8 shadow-2xl">
              <h2 className="font-heading text-2xl text-slate-900">Sign In</h2>
              <p className="mt-1 text-sm text-slate-600">Enter your credentials to continue</p>
              
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <input
                    required
                    type="text"
                    value={credentials.username}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white text-slate-900 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    required
                    type="password"
                    value={credentials.password}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white text-slate-900 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-gradient-to-r from-[#6f00ff] to-[#3b0270] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <p className="text-xs text-slate-500 text-center pt-2 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Your data is secure with end-to-end encryption. Login safely to manage your business.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* faint footer centered at bottom */}
      <div className="absolute left-0 right-0 bottom-6 pointer-events-none">
        <p className="text-center text-xs text-white/40">Ancestra Bussiness Manager Built by Ancestro</p>
      </div>
    </div>
  )
}

export default Login