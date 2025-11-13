// Central Africa Time utilities

export const CAT_TIMEZONE = 'Africa/Harare' // UTC+2, represents CAT

/**
 * Format date to African timezone
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatCATDate = (date, options = {}) => {
  const dateObj = new Date(date)
  const defaultOptions = {
    timeZone: CAT_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }
  
  return dateObj.toLocaleString('en-GB', defaultOptions)
}

/**
 * Get current time in CAT
 * @returns {Date} Current date/time adjusted to CAT
 */
export const nowCAT = () => {
  return new Date()
}

/**
 * Format date for display (short format)
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatCATShort = (date) => {
  return formatCATDate(date, {
    timeZone: CAT_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format date with time for display
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatCATDateTime = (date) => {
  return formatCATDate(date, {
    timeZone: CAT_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Get today's date range in CAT for filtering
 * @returns {Object} { start: string, end: string } in ISO format
 */
export const getTodayCATRange = () => {
  const now = new Date()
  
  // Get CAT timezone offset in minutes
  const catDate = new Date(now.toLocaleString("en-US", {timeZone: CAT_TIMEZONE}))
  const utcDate = new Date(now.toLocaleString("en-US", {timeZone: "UTC"}))
  const offset = catDate.getTime() - utcDate.getTime()
  
  // Adjust to CAT timezone
  const catNow = new Date(now.getTime() + offset)
  
  const start = new Date(catNow.getFullYear(), catNow.getMonth(), catNow.getDate())
  const end = new Date(catNow.getFullYear(), catNow.getMonth(), catNow.getDate(), 23, 59, 59, 999)
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Get this month's date range in CAT for filtering
 * @returns {Object} { start: string, end: string } in ISO format
 */
export const getThisMonthCATRange = () => {
  const now = new Date()
  
  // Get CAT timezone offset
  const catDate = new Date(now.toLocaleString("en-US", {timeZone: CAT_TIMEZONE}))
  const utcDate = new Date(now.toLocaleString("en-US", {timeZone: "UTC"}))
  const offset = catDate.getTime() - utcDate.getTime()
  
  // Adjust to CAT timezone
  const catNow = new Date(now.getTime() + offset)
  
  const start = new Date(catNow.getFullYear(), catNow.getMonth(), 1)
  const end = new Date(catNow.getFullYear(), catNow.getMonth() + 1, 0, 23, 59, 59, 999)
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}