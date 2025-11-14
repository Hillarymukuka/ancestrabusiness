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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3b0270] via-[#6f00ff] to-[#3b0270] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="container mx-auto max-w-6xl">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Welcome Section */}
          <div className="text-center lg:text-left space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Welcome to<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white">
                  Ancestra Business
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-purple-100 max-w-xl mx-auto lg:mx-0">
                Your simple way to manage sales, stock and reports — all in one place.
              </p>
            </div>
            
            {/* Image - Hide on small mobile, show on tablet+ */}
            <div className="hidden sm:block mt-6 sm:mt-8 rounded-xl sm:rounded-2xl overflow-hidden ring-1 ring-white/20 aspect-video bg-white/5">
              <img src="/image.jpg" alt="Dashboard preview" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Login Card */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="rounded-xl sm:rounded-2xl bg-white ring-1 ring-gray-200 p-6 sm:p-8 shadow-2xl">
              <h2 className="font-heading text-xl sm:text-2xl text-slate-900">Sign In</h2>
              <p className="mt-1 text-sm text-slate-600">Enter your credentials to continue</p>
              
              <form onSubmit={handleSubmit} className="mt-5 sm:mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <input
                    required
                    type="text"
                    value={credentials.username}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white text-slate-900 px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    required
                    type="password"
                    value={credentials.password}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white text-slate-900 px-3 sm:px-4 py-2.5 text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter password"
                  />
                </div>
                {error ? <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p> : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gradient-to-r from-[#6f00ff] to-[#3b0270] px-4 py-3 text-sm sm:text-base font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 transition-opacity shadow-lg"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <p className="text-xs text-slate-500 text-center pt-2 flex items-center justify-center gap-1.5 leading-relaxed">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" /> 
                  <span className="max-w-xs">Your data is secure with end-to-end encryption. Login safely to manage your business.</span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Smaller text on mobile */}
      <div className="absolute left-0 right-0 bottom-4 sm:bottom-6 pointer-events-none px-4">
        <p className="text-center text-xs sm:text-sm text-white/40">Ancestra Business Manager Built by Ancestro</p>
      </div>
    </div>
  )
}

export default Login