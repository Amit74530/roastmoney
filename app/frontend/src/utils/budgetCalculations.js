import { transactionAmount, transactionCalendarDate, transactionIsIncome } from './financialCalculations'
import { parseCalendarDate } from './localDate'

export const filterTransactionsByMonth = (transactions = [], periodMonth) => {
  if (!periodMonth) return transactions
  const month = parseCalendarDate(/^\d{4}-\d{2}$/.test(periodMonth) ? `${periodMonth}-01` : periodMonth)
  if (!month) return []
  return transactions.filter((transaction) => {
    const date = transactionCalendarDate(transaction)
    return date && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
  })
}

export const computeBudgetProgress = (budgets = [], transactions = []) => {
  const spendByCategory = transactions
    .filter((t) => !transactionIsIncome(t))
    .reduce((acc, t) => {
      const key = t.category || 'Other'
      acc[key] = (acc[key] || 0) + transactionAmount(t)
      return acc
    }, Object.create(null))

  return budgets.map((budget) => {
    const spent = spendByCategory[budget.category] || 0
    const rawLimit = Number(budget.monthly_limit)
    const limit = Number.isFinite(rawLimit) ? Math.max(0, rawLimit) : 0
    const remaining = limit - spent
    const percentage = limit > 0 ? (spent / limit) * 100 : 0
    const tone =
      percentage > 100 ? 'over' :
      percentage >= 90 ? 'critical' :
      percentage >= 70 ? 'warn' : 'ok'
    return { ...budget, spent, remaining, percentage, tone }
  })
}