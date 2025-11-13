import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const apiURL = baseURL.endsWith('/') ? baseURL + 'api' : baseURL + '/api'

const api = axios.create({
  baseURL: apiURL
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ancestra_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api