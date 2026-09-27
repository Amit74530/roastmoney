export const filterTransactionsByMonth = (transactions = [], periodMonth) => {
  const prefix = String(periodMonth || '').slice(0, 7)
  if (!prefix) return transactions
  return transactions.filter((t) => String(t.transaction_date || '').startsWith(prefix))
}

export const computeBudgetProgress = (budgets = [], transactions = []) => {
  const spendByCategory = transactions
    .filter((t) => t.type !== 'income')
    .reduce((acc, t) => {
      const key = t.category || 'Other'
      acc[key] = (acc[key] || 0) + Math.abs(Number(t.amount) || 0)
      return acc
    }, {})

  return budgets.map((budget) => {
    const spent = spendByCategory[budget.category] || 0
    const limit = Number(budget.monthly_limit) || 0
    const remaining = limit - spent
    const percentage = limit > 0 ? (spent / limit) * 100 : 0
    const tone =
      percentage > 100 ? 'over' :
      percentage >= 90 ? 'critical' :
      percentage >= 70 ? 'warn' : 'ok'
    return { ...budget, spent, remaining, percentage, tone }
  })
}