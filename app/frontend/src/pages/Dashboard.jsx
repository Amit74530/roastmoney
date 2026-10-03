import { useState } from 'react'
import { Plus } from 'lucide-react'
import BalanceHero from '../components/BalanceHero'
import QuickActionsCompact from '../components/QuickActionsCompact'
import CashFlowChart from '../components/CashFlowChart'
import RecentTransactions from '../components/RecentTransactions'
import FinancialHealth from '../components/FinancialHealth'
import TransactionModal from '../components/TransactionModal'
import BudgetCard from '../components/BudgetCard'
import useToast from '../hooks/useToast'
import { getUser } from '../utils/storage'

export default function Dashboard({ transactions, budgets, onAdd, loading, error }) {
  const [modalType, setModalType] = useState(null)
  const { toast } = useToast()
  const userName = (getUser()?.name || 'there').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="page-intro dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1>{greeting}, {userName}.</h1>
          <p className="lead dashboard-hero-description">A little clarity for your money. A little honesty for you.</p>
        </div>
        <button className="button lime" onClick={() => setModalType('expense')}><Plus size={17} /> Add transaction</button>
      </div>

      {loading ? (
        <section className="card ledger-status" role="status">Loading your financial overview…</section>
      ) : error ? (
        <section className="card ledger-status" role="alert"><p>{error}</p><button className="button outline" onClick={() => window.location.reload()}>Try again</button></section>
      ) : (
        <>
          <BalanceHero transactions={transactions} />
          <QuickActionsCompact onAdd={setModalType} />
          <div className="dashboard-content-grid">
            <CashFlowChart transactions={transactions} />
            <div className="dashboard-aside">
              <FinancialHealth transactions={transactions} onAdd={setModalType} />
              <BudgetCard budgets={budgets} transactions={transactions} />
            </div>
          </div>
          <RecentTransactions transactions={transactions} onAdd={() => setModalType('expense')} />
        </>
      )}

      {modalType && (
        <TransactionModal
          type={modalType}
          onSave={async (payload) => {
            const result = await onAdd(payload)
            setModalType(null)
            toast.success(
              result?.roast?.text || 'Transaction added. The evidence has been logged.',
              result?.roast ? 5200 : 2600,
            )
          }}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  )
}
