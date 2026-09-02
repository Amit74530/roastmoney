import { ArrowDownLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRecentTransactions, transactionAmount, transactionIsIncome } from '../utils/financialCalculations'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`
const iconFor = (category) => ({ Food: 'FO', Shopping: 'SH', Transport: 'TR', Subscriptions: 'SU', Entertainment: 'EN', Bills: 'BI', Other: 'OT' })[category] || 'OT'

export default function RecentTransactions({ transactions, onAdd }) {
  const recent = getRecentTransactions(transactions)
  if (!recent.length) return <section className="card empty-transactions"><span className="empty-mark">//</span><span className="eyebrow">LIVE LEDGER</span><h2>NO FINANCIAL DATA YET.</h2><p>START DOCUMENTING YOUR MONEY.</p><button className="button lime" onClick={onAdd}>ADD TRANSACTION <ArrowRight size={16} /></button></section>
  return <section className="card recent"><div className="section-head"><div><span className="eyebrow">LIVE LEDGER / LATEST 5</span><h2>RECENT TRANSACTIONS</h2></div><Link to="/transactions" className="text-link">VIEW ALL TRANSACTIONS <ArrowRight size={15} /></Link></div><div className="tx-list">{recent.map((item) => { const income = transactionIsIncome(item); return <div className="tx-row" key={item.id}><div className="merchant-icon">{iconFor(item.category)}</div><div className="tx-name"><strong>{item.merchant}</strong><small>{item.category} · {item.date}</small></div><span className={`money-direction ${income ? 'income' : 'expense'}`} title={income ? 'Income' : 'Expense'}>{income ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><strong className={`tx-amount ${income ? 'income-text' : ''}`}>{income ? '+' : '-'}{money(transactionAmount(item))}</strong></div> })}</div></section>
}
