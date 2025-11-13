import api from './api.js'

const ABSOLUTE_URL_REGEX = /^(?:[a-z]+:)?\/\//i

export const resolveMediaUrl = (url) => {
  if (!url) return ''
  if (ABSOLUTE_URL_REGEX.test(url)) {
    if (url.startsWith('//')) {
      if (typeof window !== 'undefined') {
        return `${window.location.protocol}${url}`
      }
      return `https:${url}`
    }
    return url
  }

  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const base = api.defaults.baseURL || fallbackOrigin
  try {
    const baseUrl = new URL(base, fallbackOrigin)
    return new URL(url, baseUrl.origin).toString()
  } catch (error) {
    try {
      return new URL(url, fallbackOrigin).toString()
    } catch (nestedError) {
      return url
    }
  }
}
