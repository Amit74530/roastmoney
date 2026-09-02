const isIncome = (transaction) => transaction.type === 'income' || Number(transaction.amount) < 0
const absoluteAmount = (transaction) => Math.abs(Number(transaction.amount) || 0)

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
    const date = new Date(`${transaction.date}T${transaction.time || '00:00'}`)
    return date.getFullYear() === year && date.getMonth() === month
  })
  return { ...calculateFinancialSummary(currentMonth), transactionCount: currentMonth.length }
}

export const getRecentTransactions = (transactions, limit = 5) => [...transactions]
  .sort((first, second) => new Date(`${second.date}T${second.time || '00:00'}`) - new Date(`${first.date}T${first.time || '00:00'}`))
  .slice(0, limit)

export const transactionIsIncome = isIncome
export const transactionAmount = absoluteAmount
