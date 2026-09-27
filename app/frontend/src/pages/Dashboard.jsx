import { useState } from 'react'
import BalanceHero from '../components/BalanceHero'
import QuickActionsCompact from '../components/QuickActionsCompact'
import MonthlyOverview from '../components/MonthlyOverview'
import RecentTransactions from '../components/RecentTransactions'
import FinancialHealth from '../components/FinancialHealth'
import TransactionModal from '../components/TransactionModal'
import BudgetCard from '../components/BudgetCard'
import { getUser } from '../utils/storage'

export default function Dashboard({ transactions, budgets, onAdd }) {
  const [modalType, setModalType] = useState(null)
  const [toast, setToast] = useState('')
  const userName = (getUser()?.name || 'there').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="dashboard-ambient" aria-hidden="true">
        <i className="ambient-orb orb-one" />
        <i className="ambient-orb orb-two" />
        <i className="ambient-orb orb-three" />
      </div>

      <div className="page-intro dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1>{greeting}, {userName}.</h1>
          <p className="headline dashboard-hero-description">
            Your money has opinions. Today, they sound{' '}
            <em>{transactions.length ? 'slightly concerned.' : 'like a blank page.'}</em>
          </p>
        </div>
        <FinancialHealth transactions={transactions} onAdd={setModalType} />
      </div>

      <BalanceHero transactions={transactions} />
      <QuickActionsCompact onAdd={setModalType} />
      <BudgetCard budgets={budgets} transactions={transactions} />
      <MonthlyOverview transactions={transactions} />
      <RecentTransactions transactions={transactions} onAdd={() => setModalType('expense')} />

      {toast && <div className="toast" role="status">{toast}</div>}

      {modalType && (
        <TransactionModal
          type={modalType}
          onSave={async (payload) => {
            const result = await onAdd(payload)
            setModalType(null)
            setToast(result?.roast?.text || 'Transaction added. The evidence has been logged.')
            window.setTimeout(() => setToast(''), result?.roast ? 5200 : 2600)
          }}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  )
}