// Calendar fields are not UTC instants: keep the stated day and reject rollover.
export function parseCalendarDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
  }
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ]\d{2}:\d{2})/.exec(value)
  if (!match || (value.length > 10 && Number.isNaN(new Date(value).getTime()))) return null
  const [, year, month, day] = match.map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function normalizeClockTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d{1,6})?)?$/.exec(String(value ?? '').trim())
  return match ? `${match[1]}:${match[2]}:${match[3] || '00'}` : ''
}

export function localDateInputValue(value = new Date()) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseCalendarDate(value) || new Date(NaN)
    : value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    const now = new Date()
    return formatLocalDate(now)
  }
  return formatLocalDate(date)
}

export function localTimeInputValue(value = new Date()) {
  if (typeof value === 'string') return normalizeClockTime(value).slice(0, 5)
  const date = value instanceof Date ? value : new Date(NaN)
  if (Number.isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatLocalDate(date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
