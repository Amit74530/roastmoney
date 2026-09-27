import { ArrowDownLeft, ArrowUpRight, ScanLine, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function QuickActionsCompact({ onAdd }) {
  return (
    <section className="quick-grid">
      <button className="quick-tile" onClick={() => onAdd('income')}>
        <span className="quick-tile-icon income"><ArrowDownLeft size={18} /></span>
        <span>Income</span>
      </button>
      <button className="quick-tile" onClick={() => onAdd('expense')}>
        <span className="quick-tile-icon expense"><ArrowUpRight size={18} /></span>
        <span>Expense</span>
      </button>
      <Link className="quick-tile" to="/roastscan">
        <span className="quick-tile-icon scan"><ScanLine size={18} /></span>
        <span>Scan</span>
      </Link>
      <Link className="quick-tile" to="/analytics">
        <span className="quick-tile-icon neutral"><BarChart3 size={18} /></span>
        <span>Insights</span>
      </Link>
    </section>
  )
}