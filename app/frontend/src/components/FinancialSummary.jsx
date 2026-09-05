import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, PiggyBank } from 'lucide-react'
import { calculateFinancialSummary } from '../utils/financialCalculations'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function FinancialSummary({ transactions }) {
  const summary = calculateFinancialSummary(transactions)
  const cards = [
    ['TOTAL BALANCE', summary.totalBalance, 'INCOME - EXPENSES', CircleDollarSign, 'value-primary'],
    ['TOTAL INCOME', summary.totalIncome, 'MONEY IN', ArrowDownLeft, 'value-primary'],
    ['TOTAL EXPENSES', summary.totalExpenses, 'MONEY OUT', ArrowUpRight, 'value-neutral'],
    ['TOTAL SAVINGS', summary.totalSavings, 'CURRENT BALANCE', PiggyBank, 'value-primary'],
  ]
  return <div className="financial-summary">{cards.map(([label, value, foot, Icon, accent]) => <section className="card finance-card" key={label}><div className="finance-card-top"><span className="metric-label">{label}</span><Icon size={18} /></div><strong className={accent}>{money(value)}</strong><small>{foot}</small></section>)}</div>
}
