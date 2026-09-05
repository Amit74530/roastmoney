import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, PiggyBank } from 'lucide-react'
import { calculateFinancialSummary } from '../utils/financialCalculations'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function FinancialSummary({ transactions }) {
  const summary = calculateFinancialSummary(transactions)
  const cards = [
    ['Total balance', summary.totalBalance, 'Income minus expenses', CircleDollarSign, 'value-primary'],
    ['Total income', summary.totalIncome, 'Money in', ArrowDownLeft, 'value-primary'],
    ['Total expenses', summary.totalExpenses, 'Money out', ArrowUpRight, 'value-neutral'],
    ['Total savings', summary.totalSavings, 'Current balance', PiggyBank, 'value-primary'],
  ]
  return (
    <div className="financial-summary">
      {cards.map(([label, value, foot, Icon, accent]) => (
        <section className="card finance-card" key={label}>
          <div className="finance-card-top"><span className="metric-label">{label}</span><Icon size={18} /></div>
          <strong className={accent}>{money(value)}</strong>
          <small>{foot}</small>
        </section>
      ))}
    </div>
  )
}
