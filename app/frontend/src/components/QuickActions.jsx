import { ArrowDownLeft, ArrowUpRight, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function QuickActions({ onAdd }) {
  return <section className="quick-actions"><div><span className="eyebrow">QUICK ACTIONS</span><h2>MAKE THE NEXT MONEY MOVE.</h2></div><div className="quick-action-buttons"><button className="button lime" onClick={() => onAdd?.('income')}><ArrowDownLeft size={16} /> ADD INCOME</button><button className="button outline" onClick={() => onAdd?.('expense')}><ArrowUpRight size={16} /> ADD EXPENSE</button><Link className="button text-button" to="/analytics"><BarChart3 size={16} /> VIEW ANALYTICS</Link></div></section>
}
