import { BarChart3, Hash, Receipt, TrendingDown } from 'lucide-react'
import { calculateStatistics } from '../utils/analyticsCalculations'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function FinancialStatistics({ transactions }) {
  const stats = calculateStatistics(transactions)
  const cards = [['HIGHEST EXPENSE', stats.highestExpense ? money(stats.highestExpense.amount) : '₹0', stats.highestExpense?.title || 'No expense recorded', TrendingDown], ['AVERAGE TRANSACTION', money(stats.averageTransaction), 'Expense average', BarChart3], ['MOST USED CATEGORY', stats.mostUsedCategory, 'By expense total', Receipt], ['TOTAL TRANSACTIONS', stats.totalTransactions, 'In this period', Hash]]
  return <div className="analytics-statistics">{cards.map(([label, value, foot, Icon]) => <section className="card analytics-stat" key={label}><Icon size={17} /><span className="metric-label">{label}</span><strong>{value}</strong><small>{foot}</small></section>)}</div>
}
