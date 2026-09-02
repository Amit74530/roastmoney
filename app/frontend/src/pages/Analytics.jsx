import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import IncomeExpenseChart from '../components/IncomeExpenseChart'
import SpendingCategoryChart from '../components/SpendingCategoryChart'
import FinancialStatistics from '../components/FinancialStatistics'
import MoneyInsights from '../components/MoneyInsights'
import { filterTransactionsByTime, getPreviousPeriodTransactions, timeFilters } from '../utils/analyticsCalculations'

export default function Analytics({ transactions }) {
  const [filter, setFilter] = useState('all')
  const selectedTransactions = useMemo(() => filterTransactionsByTime(transactions, filter), [transactions, filter])
  const previousTransactions = useMemo(() => getPreviousPeriodTransactions(transactions, filter), [transactions, filter])
  const hasEvidence = selectedTransactions.length > 0
  return <><div className="analytics-intro page-intro compact-intro"><div><p className="eyebrow">FINANCIAL INTELLIGENCE / CASE FILE 02</p><h1>YOUR MONEY, UNDER INVESTIGATION.</h1><p className="lead">Patterns, habits, and the evidence you hoped we wouldn't find.</p></div><div className="analytics-filter"><Search size={16} />{timeFilters.map((item) => <button className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)} key={item.value}>{item.label}</button>)}</div></div>{hasEvidence ? <><FinancialStatistics transactions={selectedTransactions} /><div className="analytics-panels"><IncomeExpenseChart transactions={selectedTransactions} /><SpendingCategoryChart transactions={selectedTransactions} /></div><MoneyInsights transactions={selectedTransactions} previousTransactions={previousTransactions} /></> : <section className="analytics-empty card"><span className="empty-mark">//</span><span className="eyebrow">CASE FILE / INCONCLUSIVE</span><h2>NOT ENOUGH EVIDENCE.</h2><p>ADD MORE TRANSACTIONS TO INVESTIGATE YOUR MONEY.</p><Link to="/transactions" className="button lime">ADD TRANSACTION <ArrowRight size={16} /></Link></section>}</>
}
