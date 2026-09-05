import { getAchievementView, getPersonalityView } from '../lib/engines/insights'
import { calculateFinancialSummary, transactionAmount, transactionIsIncome } from './financialCalculations'

const expenseTransactions = (transactions) => transactions.filter((transaction) => !transactionIsIncome(transaction))

export const getFinancialHealth = (transactions) => {
  const summary = calculateFinancialSummary(transactions)
  if (!transactions.length) return { label: 'New', tone: 'lime', message: 'Your financial story starts here.' }
  if (summary.totalIncome === 0 && summary.totalExpenses > 0) return { label: 'Critical', tone: 'red', message: 'Your wallet is spending without a known income.' }
  const ratio = summary.totalIncome ? summary.totalExpenses / summary.totalIncome : 1
  if (ratio <= 0.35) return { label: 'Excellent', tone: 'lime', message: 'Your money situation looks surprisingly responsible.' }
  if (ratio <= 0.65) return { label: 'Good', tone: 'lime', message: 'You are covering your spending with room to breathe.' }
  if (ratio <= 0.9) return { label: 'Stable', tone: 'orange', message: 'Your income is covering your spending, for now.' }
  if (ratio > 1.15) return { label: 'Critical', tone: 'red', message: 'Spending has overtaken income. This is not a vibe. It is a warning.' }
  return { label: 'Concerned', tone: 'orange', message: 'Your wallet is getting nervous.' }
}

export const getSpendingPersonality = (transactions) => getPersonalityView(transactions)

export const getAchievementData = (transactions) => getAchievementView(transactions)

export const getWrappedData = (transactions) => {
  const summary = calculateFinancialSummary(transactions)
  const expenses = expenseTransactions(transactions)
  const category = expenses.reduce((result, transaction) => { const name = transaction.category || 'Other'; result[name] = (result[name] || 0) + transactionAmount(transaction); return result }, {})
  const topCategory = Object.entries(category).sort((first, second) => second[1] - first[1])[0]
  const biggest = expenses.reduce((highest, transaction) => transactionAmount(transaction) > transactionAmount(highest) ? transaction : highest, expenses[0])
  return { summary, topCategory: topCategory || ['NONE', 0], biggest }
}
