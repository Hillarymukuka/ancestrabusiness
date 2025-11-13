import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import api from '../utils/api.js'
import { useAuth } from './AuthContext.jsx'

const DashboardContext = createContext(undefined)

export const DashboardProvider = ({ children }) => {
  const { token } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadSummary = async () => {
    if (!token) {
      setSummary(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/reports/summary')
      setSummary(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load dashboard summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [token])

  const value = useMemo(
    () => ({ summary, loading, error, refresh: loadSummary }),
    [summary, loading, error]
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export const useDashboard = () => {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }
  return context
}