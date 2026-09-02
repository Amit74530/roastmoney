import { ArrowRight, Lightbulb } from 'lucide-react'
import { buildInsights } from '../utils/analyticsCalculations'

export default function MoneyInsights({ transactions, previousTransactions }) {
  const insights = buildInsights(transactions, previousTransactions)
  return <section className="money-report card"><div className="section-head"><div><span className="eyebrow">BEHAVIOUR ANALYSIS</span><h2>THE MONEY REPORT</h2></div><Lightbulb size={19} /></div><div className="insight-list">{insights.map((insight, index) => <div className="report-insight" key={insight}><span>0{index + 1}</span><p>{insight}</p><ArrowRight size={15} /></div>)}</div></section>
}
