import { calculateFinancialSummary, transactionAmount, transactionIsIncome } from './financialCalculations'

const expenseTransactions = (transactions) => transactions.filter((transaction) => !transactionIsIncome(transaction))

export const getFinancialHealth = (transactions) => {
  const summary = calculateFinancialSummary(transactions)
  if (!transactions.length) return { label: 'NEW', tone: 'lime', message: 'Your financial story starts here.' }
  if (summary.totalIncome === 0 && summary.totalExpenses > 0) return { label: 'CRITICAL', tone: 'red', message: 'Your wallet is spending without a known income.' }
  const ratio = summary.totalIncome ? summary.totalExpenses / summary.totalIncome : 1
  if (ratio <= 0.35) return { label: 'EXCELLENT', tone: 'lime', message: 'Your money situation looks surprisingly responsible.' }
  if (ratio <= 0.65) return { label: 'GOOD', tone: 'lime', message: 'You are covering your spending with room to breathe.' }
  if (ratio <= 0.9) return { label: 'STABLE', tone: 'orange', message: 'Your income is covering your spending, for now.' }
  return { label: 'CONCERNED', tone: 'orange', message: 'Your wallet is getting nervous.' }
}

export const getSpendingPersonality = (transactions) => {
  const expenses = expenseTransactions(transactions)
  if (!expenses.length) return { title: 'THE FINANCIAL MYSTERY', description: 'No spending evidence yet. A surprisingly clean record.', impulse: 0, discipline: 100, chaos: 0 }
  const smallPurchases = expenses.filter((transaction) => transactionAmount(transaction) < 500).length
  const lateNight = expenses.filter((transaction) => {
    const time = transaction.time
    if (!time) return false
    const hour = Number(String(time).slice(0, 2))
    return Number.isFinite(hour) && (hour >= 22 || hour < 5)
  }).length
  const total = expenses.reduce((sum, transaction) => sum + transactionAmount(transaction), 0)
  const impulse = Math.min(99, Math.round((smallPurchases / expenses.length) * 55 + (lateNight / expenses.length) * 45))
  const discipline = Math.max(1, Math.min(99, Math.round((1 - total / Math.max(calculateFinancialSummary(transactions).totalIncome || total, total)) * 100)))
  const chaos = Math.min(99, Math.round((lateNight / expenses.length) * 65 + Math.min(34, expenses.length)))
  if (discipline >= 70) return { title: 'THE RESPONSIBLE ADULT', description: 'Somehow, against all odds, you are making sensible financial decisions.', impulse, discipline, chaos }
  if (chaos >= 65) return { title: 'THE MIDNIGHT MENACE', description: 'Your best financial decisions apparently happen after everyone else is asleep.', impulse, discipline, chaos }
  if (impulse >= 60) return { title: 'THE IMPULSE BUYER', description: 'You have the financial discipline of someone walking through IKEA without a list.', impulse, discipline, chaos }
  return { title: 'THE CONTROLLED CHAOS', description: 'There is a system here. It is not a system anyone else would recognize.', impulse, discipline, chaos }
}

export const getAchievementData = (transactions) => {
  const expenses = expenseTransactions(transactions)
  const summary = calculateFinancialSummary(transactions)
  return [
    { title: 'FIRST TRANSACTION', description: 'You officially started tracking your financial chaos.', unlocked: transactions.length >= 1, progress: `${Math.min(transactions.length, 1)} / 1` },
    { title: 'EXPENSE TRACKER', description: 'Logged 10 transactions. The evidence is accumulating.', unlocked: transactions.length >= 10, progress: `${Math.min(transactions.length, 10)} / 10` },
    { title: 'SAVINGS STARTER', description: 'Income is currently ahead of expenses.', unlocked: summary.totalBalance > 0, progress: summary.totalBalance > 0 ? 'UNLOCKED' : 'KEEP GOING' },
    { title: 'CONSISTENCY MACHINE', description: 'Tracked finances across multiple calendar months.', unlocked: new Set(transactions.map((transaction) => (transaction.transaction_date || '').slice(0, 7))).size >= 2, progress: `${new Set(transactions.map((transaction) => (transaction.transaction_date || '').slice(0, 7))).size} months` },
    { title: 'CATEGORY CONNOISSEUR', description: 'Logged spending in three different categories.', unlocked: new Set(expenses.map((transaction) => transaction.category)).size >= 3, progress: `${new Set(expenses.map((transaction) => transaction.category)).size} categories` },
  ]
}

export const getWrappedData = (transactions) => {
  const summary = calculateFinancialSummary(transactions)
  const expenses = expenseTransactions(transactions)
  const category = expenses.reduce((result, transaction) => { const name = transaction.category || 'Other'; result[name] = (result[name] || 0) + transactionAmount(transaction); return result }, {})
  const topCategory = Object.entries(category).sort((first, second) => second[1] - first[1])[0]
  const biggest = expenses.reduce((highest, transaction) => transactionAmount(transaction) > transactionAmount(highest) ? transaction : highest, expenses[0])
  return { summary, topCategory: topCategory || ['NONE', 0], biggest }
}
