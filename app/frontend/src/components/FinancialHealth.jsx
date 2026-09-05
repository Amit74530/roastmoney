import { Activity, ArrowRight, Plus } from 'lucide-react'
import { getFinancialHealth } from '../utils/financialInsights'

export default function FinancialHealth({ transactions, onAdd }) {
  const health = getFinancialHealth(transactions)
  return (
    <section className={`card financial-health ${health.tone}`}>
      <div className="health-top">
        <div>
          <span className="eyebrow">Financial health</span>
          <h2><i /> {health.label}</h2>
        </div>
        <Activity size={20} />
      </div>
      <p>{health.message}</p>
      {transactions.length
        ? <button className="text-link" onClick={() => onAdd?.('expense')}>Log another decision <ArrowRight size={15} /></button>
        : <button className="button lime" onClick={() => onAdd?.('expense')}>Add your first transaction <Plus size={15} /></button>}
    </section>
  )
}
