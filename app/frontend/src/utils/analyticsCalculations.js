import { calculateFinancialSummary, transactionAmount, transactionCalendarDate, transactionIsIncome } from './financialCalculations'

export const timeFilters = [
  { value: 'month', label: 'THIS MONTH', months: 1 },
  { value: 'three', label: 'LAST 3 MONTHS', months: 3 },
  { value: 'six', label: 'LAST 6 MONTHS', months: 6 },
  { value: 'all', label: 'ALL TIME', months: null },
]

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const filterTransactionsByTime = (transactions, filter, referenceDate = new Date()) => {
  const selected = timeFilters.find((item) => item.value === filter) || timeFilters[3]
  if (selected.months === null) return transactions
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - selected.months + 1, 1)
  const end = startOfDay(referenceDate)
  return transactions.filter((transaction) => {
    const date = transactionCalendarDate(transaction)
    return date && date >= start && date <= end
  })
}

export const getPreviousPeriodTransactions = (transactions, filter, referenceDate = new Date()) => {
  const selected = timeFilters.find((item) => item.value === filter)
  if (!selected?.months) return []
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - selected.months + 1, 0)
  const start = new Date(end.getFullYear(), end.getMonth() - selected.months + 1, 1)
  return transactions.filter((transaction) => {
    const date = transactionCalendarDate(transaction)
    return date && date >= start && date <= end
  })
}

export const buildIncomeExpenseTrend = (transactions) => {
  const grouped = transactions.reduce((result, transaction) => {
    const date = transactionCalendarDate(transaction)
    if (!date) return result
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    result[key] ||= { key, label: date.toLocaleString('en-US', { month: 'short' }), income: 0, expenses: 0 }
    result[key][transactionIsIncome(transaction) ? 'income' : 'expenses'] += transactionAmount(transaction)
    return result
  }, {})
  return Object.values(grouped).sort((first, second) => first.key.localeCompare(second.key))
}

export const buildCategoryBreakdown = (transactions) => Object.entries(transactions.filter((transaction) => !transactionIsIncome(transaction)).reduce((result, transaction) => {
  result[transaction.category] = (result[transaction.category] || 0) + transactionAmount(transaction)
  return result
}, {})).map(([name, value]) => ({ name, value })).sort((first, second) => second.value - first.value)

export const calculateStatistics = (transactions) => {
  const expenses = transactions.filter((transaction) => !transactionIsIncome(transaction))
  const highestExpense = expenses.reduce((highest, transaction) => transactionAmount(transaction) > transactionAmount(highest) ? transaction : highest, expenses[0] || null)
  const expenseTotal = expenses.reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
  const averageTransaction = expenses.length ? expenseTotal / expenses.length : 0
  const categoryBreakdown = buildCategoryBreakdown(transactions)
  return { highestExpense, averageTransaction, mostUsedCategory: categoryBreakdown[0]?.name || 'NONE', totalTransactions: transactions.length }
}

export const buildInsights = (transactions, previousTransactions = []) => {
  if (!transactions.length) return ['You have no financial data in this period.']
  const summary = calculateFinancialSummary(transactions)
  const previousSummary = calculateFinancialSummary(previousTransactions)
  const category = buildCategoryBreakdown(transactions)[0]
  const insights = []
  if (category) insights.push(`Your biggest spending category is ${category.name}.`)
  if (previousTransactions.length && summary.totalExpenses > previousSummary.totalExpenses) insights.push('You spent more this period than the previous one.')
  if (summary.totalExpenses > summary.totalIncome) insights.push('Your expenses are higher than your income.')
  else if (summary.totalIncome > summary.totalExpenses) insights.push('Your income exceeds your expenses.')
  if (!summary.totalExpenses) insights.push('You have no expense data yet.')
  return insights
}
