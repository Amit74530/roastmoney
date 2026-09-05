import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import { calculateMonthlyOverview } from '../utils/financialCalculations'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function MonthlyOverview({ transactions }) {
  const overview = calculateMonthlyOverview(transactions)
  const items = [['MONTHLY INCOME', overview.totalIncome, ArrowDownLeft, 'lime-text'], ['MONTHLY EXPENSES', overview.totalExpenses, ArrowUpRight, 'orange-text'], ['MONTHLY BALANCE', overview.totalBalance, Scale, overview.totalBalance >= 0 ? 'lime-text' : 'red-text']]
  const scale = Math.max(overview.totalIncome, overview.totalExpenses, 1)
  return <section className="card monthly-overview"><div className="section-head"><div><span className="eyebrow">CURRENT MONTH / {new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase()}</span><h2>MONTHLY OVERVIEW</h2></div><span className="monthly-count">{overview.transactionCount} decisions logged</span></div><div className="monthly-items">{items.map(([label, value, Icon, accent]) => <div className="monthly-item" key={label}><Icon size={17} /><span className="metric-label">{label}</span><strong className={accent}>{money(value)}</strong><i className={`monthly-bar ${accent}`}><b style={{ width: `${Math.min(100, Math.round(Math.abs(value) / scale * 100))}%` }} /></i></div>)}</div></section>
}
