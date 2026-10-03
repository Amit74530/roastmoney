import { parseCalendarDate } from '../../utils/localDate.js'

const CATEGORY_ALIASES = Object.assign(Object.create(null), {
  Transport: 'Travel',
  Health: 'Other',
  Education: 'Other',
  Salary: 'Other',
  Freelance: 'Other',
  Business: 'Other',
  Investment: 'Other',
})

const normalizeClock = (time) => {
  const raw = String(time || '').trim()
  if (!raw) return ''
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(raw)
  if (!match) return ''
  return `${match[1]}:${match[2]}:${match[3] || '00'}`
}

export const isExpenseTransaction = (transaction) => transaction?.type !== 'income'

export const mapEngineCategory = (category) => {
  if (typeof category === 'string' && Object.hasOwn(CATEGORY_ALIASES, category)) {
    return CATEGORY_ALIASES[category]
  }
  return category || 'Other'
}

export function toEngineTransaction(transaction = {}) {
  const rawDate = transaction.transaction_date || transaction.date
  const parsedDate = parseCalendarDate(rawDate)
  let day = ''
  if (parsedDate) {
    const year = parsedDate.getFullYear()
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const dateNum = String(parsedDate.getDate()).padStart(2, '0')
    day = `${year}-${month}-${dateNum}`
  }

  const clock = normalizeClock(transaction.time || transaction.transaction_time)
  let timestamp = ''
  let hourKnown = false

  if (day) {
    if (clock) {
      timestamp = `${day}T${clock}`
      hourKnown = true
    } else {
      timestamp = `${day}T12:00:00`
      hourKnown = false
    }
  }

  const rawAmount = Number(transaction.amount)
  const amount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0

  return {
    merchant: transaction.title || transaction.merchant || 'Transaction',
    amount,
    category: mapEngineCategory(transaction.category),
    timestamp,
    hourKnown,
  }
}

export function toEngineExpenses(transactions = []) {
  return transactions.filter(isExpenseTransaction).map(toEngineTransaction)
}
