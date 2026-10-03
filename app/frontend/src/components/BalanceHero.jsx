import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import { calculateFinancialSummary, calculateMonthlyOverview } from '../utils/financialCalculations'

const money = (value) => `${value < 0 ? '−' : ''}₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`

export default function BalanceHero({ transactions }) {
  const summary = calculateFinancialSummary(transactions)
  const month = calculateMonthlyOverview(transactions)
  return (
    <section className="overview-stats" aria-label="Financial overview">
      <article className="balance-hero">
        <div className="stat-card-head"><span>Total balance</span><Wallet size={20} /></div>
        <strong className="balance-hero-amount">{money(summary.totalBalance)}</strong>
        <div className="balance-caption"><span className="balance-dot" />{transactions.length ? 'Income minus expenses · all time' : 'Your fresh start begins here'}</div>
        <div className="balance-decoration" aria-hidden="true" />
      </article>
      <article className="card overview-stat">
        <div className="stat-card-head"><span>Monthly income</span><span className="stat-icon income"><ArrowDownLeft size={20} /></span></div>
        <strong>{money(month.totalIncome)}</strong>
        <p><span className="stat-dot income" />Money coming in <span className="stat-period">This month</span></p>
      </article>
      <article className="card overview-stat">
        <div className="stat-card-head"><span>Monthly expenses</span><span className="stat-icon expense"><ArrowUpRight size={20} /></span></div>
        <strong>{money(month.totalExpenses)}</strong>
        <p><span className="stat-dot expense" />Money going out <span className="stat-period">This month</span></p>
      </article>
    </section>
  )
}
