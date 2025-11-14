import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'

import api from '../utils/api.js'

const AuthContext = createContext(undefined)

// Auto-logout after 30 minutes of inactivity
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ancestra_user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('ancestra_token'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inactivityTimerRef = useRef(null)

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (!token) return

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Set new timer
    inactivityTimerRef.current = setTimeout(() => {
      console.log('User inactive for 30 minutes. Logging out...')
      logout()
      alert('You have been logged out due to inactivity for security reasons.')
    }, INACTIVITY_TIMEOUT)
  }, [token])

  // Track user activity
  useEffect(() => {
    if (!token) return

    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    // Reset timer on any activity
    const handleActivity = () => resetInactivityTimer()

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Initialize timer
    resetInactivityTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [token, resetInactivityTimer])

  useEffect(() => {
    if (token) {
      localStorage.setItem('ancestra_token', token)
    } else {
      localStorage.removeItem('ancestra_token')
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem('ancestra_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('ancestra_user')
    }
  }, [user])

  const login = async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ username, password })
      const { data } = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      setToken(data.access_token)
      const meResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` }
      })
      setUser(meResponse.data)
      return meResponse.data
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (payload) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/register', payload)
      return data
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, token, loading, error, login, register, logout }),
    [user, token, loading, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}