const isIncome = (transaction) => transaction.type === 'income'
const absoluteAmount = (transaction) => Math.abs(Number(transaction.amount) || 0)

const parseTransactionDate = (transaction) => {
  const raw = transaction.transaction_date || transaction.date
  if (!raw) return null
  const [year, month, day] = String(raw).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export const calculateFinancialSummary = (transactions) => {
  const totalIncome = transactions.filter(isIncome).reduce((sum, transaction) => sum + absoluteAmount(transaction), 0)
  const totalExpenses = transactions.filter((transaction) => !isIncome(transaction)).reduce((sum, transaction) => sum + absoluteAmount(transaction), 0)
  const totalBalance = totalIncome - totalExpenses
  return { totalBalance, totalIncome, totalExpenses, totalSavings: totalBalance }
}

export const calculateMonthlyOverview = (transactions, referenceDate = new Date()) => {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const currentMonth = transactions.filter((transaction) => {
    const date = parseTransactionDate(transaction)
    return date && date.getFullYear() === year && date.getMonth() === month
  })
  return { ...calculateFinancialSummary(currentMonth), transactionCount: currentMonth.length }
}

export const getRecentTransactions = (transactions, limit = 5) => [...transactions]
  .sort((first, second) => {
    const firstDate = first.transaction_date || first.date || ''
    const secondDate = second.transaction_date || second.date || ''
    const byDate = String(secondDate).localeCompare(String(firstDate))
    if (byDate !== 0) return byDate
    return String(second.created_at || '').localeCompare(String(first.created_at || ''))
  })
  .slice(0, limit)

export const transactionIsIncome = isIncome
export const transactionAmount = absoluteAmount
export const transactionCalendarDate = parseTransactionDate
