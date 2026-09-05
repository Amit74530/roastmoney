const CATEGORY_ALIASES = {
  Transport: 'Travel',
  Health: 'Other',
  Education: 'Other',
  Salary: 'Other',
  Freelance: 'Other',
  Business: 'Other',
  Investment: 'Other',
}

const localDateString = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeClock = (time) => {
  const raw = String(time || '').trim()
  if (!raw) return ''
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`
  if (/^\d{2}:\d{2}:\d{2}/.test(raw)) return raw.slice(0, 8)
  return ''
}

export const isExpenseTransaction = (transaction) => transaction?.type !== 'income'

export const mapEngineCategory = (category) => CATEGORY_ALIASES[category] || category || 'Other'

export function toEngineTransaction(transaction = {}) {
  const day = String(transaction.transaction_date || transaction.date || '').slice(0, 10)
  const clock = normalizeClock(transaction.time)
  let timestamp = day ? `${day}T12:00:00` : new Date().toISOString()
  let hourKnown = Boolean(clock)

  if (clock && day) {
    timestamp = `${day}T${clock}`
  } else if (transaction.created_at && day) {
    const created = new Date(transaction.created_at)
    if (!Number.isNaN(created.getTime()) && localDateString(created) === day) {
      timestamp = created.toISOString()
      hourKnown = true
    }
  }

  return {
    merchant: transaction.title || transaction.merchant || 'Transaction',
    amount: Math.abs(Number(transaction.amount) || 0),
    category: mapEngineCategory(transaction.category),
    timestamp,
    hourKnown,
  }
}

export function toEngineExpenses(transactions = []) {
  return transactions.filter(isExpenseTransaction).map(toEngineTransaction)
}
