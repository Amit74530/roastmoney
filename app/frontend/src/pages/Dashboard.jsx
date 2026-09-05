import { useState } from 'react'
import FinancialSummary from '../components/FinancialSummary'
import MonthlyOverview from '../components/MonthlyOverview'
import RecentTransactions from '../components/RecentTransactions'
import FinancialHealth from '../components/FinancialHealth'
import QuickActions from '../components/QuickActions'
import TransactionModal from '../components/TransactionModal'
import { getUser } from '../utils/storage'

export default function Dashboard({ transactions, onAdd }) {
  const [modalType, setModalType] = useState(null)
  const [toast, setToast] = useState('')
  const userName = (getUser()?.name || 'THERE').split(' ')[0].toUpperCase()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'
  return <><div className="dashboard-ambient" aria-hidden="true"><i className="ambient-orb orb-one" /><i className="ambient-orb orb-two" /><i className="ambient-orb orb-three" /></div><div className="page-intro dashboard-hero"><div className="dashboard-hero-copy"><p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</p><h1>{greeting}, {userName}.</h1><p className="headline dashboard-hero-description">Your money has opinions. Today, they sound <em>{transactions.length ? 'slightly concerned.' : 'like a blank page.'}</em></p></div><FinancialHealth transactions={transactions} onAdd={setModalType} /></div><QuickActions onAdd={setModalType} /><FinancialSummary transactions={transactions} /><MonthlyOverview transactions={transactions} /><RecentTransactions transactions={transactions} onAdd={() => setModalType('expense')} />{toast && <div className="toast" role="status">{toast}</div>}{modalType && <TransactionModal type={modalType} onSave={async (payload) => { const result = await onAdd(payload); setModalType(null); setToast(result?.roast?.text || 'TRANSACTION ADDED. THE EVIDENCE HAS BEEN LOGGED.'); window.setTimeout(() => setToast(''), result?.roast ? 5200 : 2600) }} onClose={() => setModalType(null)} />}</>
}
