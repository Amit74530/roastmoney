import { ArrowDownLeft, ArrowUpRight, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function QuickActions({ onAdd }) {
  return (
    <section className="card quick-actions">
      <div>
        <span className="eyebrow">Quick actions</span>
        <h2>Make the next money move.</h2>
      </div>
      <div className="quick-action-buttons">
        <button className="button lime" onClick={() => onAdd?.('income')}><ArrowDownLeft size={16} /> Add income</button>
        <button className="button outline" onClick={() => onAdd?.('expense')}><ArrowUpRight size={16} /> Add expense</button>
        <Link className="button text-button" to="/analytics"><BarChart3 size={16} /> View insights</Link>
      </div>
    </section>
  )
}
