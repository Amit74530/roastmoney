import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { computeBudgetProgress, filterTransactionsByMonth } from '../utils/budgetCalculations'
import { firstOfMonth } from '../lib/budgetService'

const money = (v) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`

export default function BudgetCard({ budgets, transactions }) {
  if (!budgets?.length) return (
    <section className="card budget-card budget-get-started">
      <span className="eyebrow">Give your money a plan</span>
      <h2>A little structure. Less stress.</h2>
      <p>Set a monthly limit and keep the things you love in your budget.</p>
      <Link to="/budgets" className="text-link">Create a budget <ArrowRight size={15} /></Link>
    </section>
  )

  const monthTx = filterTransactionsByMonth(transactions, firstOfMonth())
  const top = computeBudgetProgress(budgets, monthTx)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)

  return (
    <section className="card budget-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Monthly plan</span>
          <h2>Budget watch</h2>
        </div>
        <Link to="/budgets" className="text-link">Full view <ArrowRight size={15} /></Link>
      </div>
      <div className="budget-card-list">
        {top.map((b) => (
          <div className={`budget-mini budget-${b.tone}`} key={b.id}>
            <div className="budget-mini-top">
              <span>{b.category}</span>
              <b>{money(b.spent)} / {money(b.monthly_limit)}</b>
            </div>
            <div className="budget-bar"><i style={{ width: `${Math.min(100, b.percentage)}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  )
}