import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { calculateFinancialSummary } from '../utils/financialCalculations'

const money = (v) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`

export default function BalanceHero({ transactions }) {
  const s = calculateFinancialSummary(transactions)
  const positive = s.totalBalance >= 0

  return (
    <section className="balance-hero">
      <div className="balance-hero-head">
        <span className="balance-hero-label">Total balance</span>
        <span className={`balance-hero-badge ${positive ? 'ok' : 'over'}`}>
          {positive ? 'Positive' : 'Critical'}
        </span>
      </div>

      <strong className="balance-hero-amount">
        {positive ? '' : '−'}{money(s.totalBalance)}
      </strong>

      <div className="balance-hero-rows">
        <div className="balance-hero-row">
          <span className="balance-hero-icon income"><ArrowDownLeft size={14} /></span>
          <span className="balance-hero-row-label">Income</span>
          <strong>{money(s.totalIncome)}</strong>
        </div>
        <div className="balance-hero-row">
          <span className="balance-hero-icon expense"><ArrowUpRight size={14} /></span>
          <span className="balance-hero-row-label">Expenses</span>
          <strong>{money(s.totalExpenses)}</strong>
        </div>
      </div>
    </section>
  )
}