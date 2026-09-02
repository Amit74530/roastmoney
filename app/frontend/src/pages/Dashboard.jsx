import { Link } from 'react-router-dom'
import FinancialSummary from '../components/FinancialSummary'
import MonthlyOverview from '../components/MonthlyOverview'
import RecentTransactions from '../components/RecentTransactions'

export default function Dashboard({ transactions, onAdd }) {
  const userName = 'AMIT'
  return <><div className="page-intro"><div><p className="eyebrow">WEDNESDAY, 02 SEPTEMBER 2026</p><h1>GOOD EVENING, {userName}.</h1><p className="headline">Your wallet is feeling <em>slightly concerned.</em></p></div><Link to="/transactions" className="status orange"><i /> CONCERNED</Link></div><FinancialSummary transactions={transactions} /><MonthlyOverview transactions={transactions} /><RecentTransactions transactions={transactions} onAdd={onAdd} /></>
}
