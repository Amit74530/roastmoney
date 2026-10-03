import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2, X } from 'lucide-react'
import { expenseCategories } from '../lib/transactionCategories'
import {
  copyBudgetsFromMonth, deleteUserBudget, fetchUserBudgets,
  firstOfMonth, upsertUserBudget,
} from '../lib/budgetService'
import { computeBudgetProgress, filterTransactionsByMonth } from '../utils/budgetCalculations'
import useToast from '../hooks/useToast'
import Dialog from '../components/Dialog'

const money = (v) => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`

const monthLabel = (periodMonth) => {
  const d = new Date(`${periodMonth}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const shiftMonth = (periodMonth, delta) => {
  const d = new Date(`${periodMonth}T00:00:00`)
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function Budgets({ userId, transactions, onBudgetsChanged }) {
  const [periodMonth, setPeriodMonth] = useState(firstOfMonth())
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [requestError, setRequestError] = useState('')
  const { toast } = useToast()

  const isCurrentMonth = periodMonth === firstOfMonth()

  useEffect(() => {
    if (!userId) return undefined
    let active = true
    setLoading(true)
    setRequestError('')
    fetchUserBudgets(userId, periodMonth)
      .then((rows) => { if (active) setBudgets(rows) })
      .catch((err) => { if (active) { setBudgets([]); setRequestError(err?.message || 'Could not load budgets.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, periodMonth])

  const monthTransactions = useMemo(
    () => filterTransactionsByMonth(transactions, periodMonth),
    [transactions, periodMonth],
  )

  const progress = useMemo(
    () => computeBudgetProgress(budgets, monthTransactions),
    [budgets, monthTransactions],
  )

  const totalLimit = progress.reduce((s, b) => s + b.monthly_limit, 0)
  const totalSpent = progress.reduce((s, b) => s + b.spent, 0)
  const unbudgetedCategories = expenseCategories.filter(
    (c) => !budgets.some((b) => b.category === c),
  )

  const syncParent = (next) => {
    setBudgets(next)
    if (isCurrentMonth) onBudgetsChanged?.(next)
  }

  const handleSave = async ({ category, monthly_limit }) => {
    try {
      const saved = await upsertUserBudget(userId, {
        category, monthly_limit, period_month: periodMonth,
      })
      const index = budgets.findIndex((b) => b.category === saved.category)
      const next = index >= 0
        ? budgets.map((b, i) => (i === index ? saved : b))
        : [...budgets, saved].sort((a, b) => a.category.localeCompare(b.category))
      syncParent(next)
      setDialog(null)
      toast.success('Budget saved.', 2000)
    } catch (err) {
      throw new Error(err?.message || 'Could not save budget.')
    }
  }

  const handleDelete = async (budgetId) => {
    setBusy(true)
    setRequestError('')
    try {
      await deleteUserBudget(userId, budgetId)
      syncParent(budgets.filter((b) => b.id !== budgetId))
      setDialog(null)
      toast.success('Budget removed.', 2000)
    } catch (err) {
      setRequestError(err?.message || 'Could not delete budget.')
    } finally {
      setBusy(false)
    }
  }

  const handleCopyPrevious = async () => {
    setBusy(true)
    try {
      const copied = await copyBudgetsFromMonth(userId, shiftMonth(periodMonth, -1), periodMonth)
      if (!copied.length) {
        toast.info('No budgets in the previous month to copy.')
        return
      }
      syncParent(copied.sort((a, b) => a.category.localeCompare(b.category)))
      toast.success(`Copied ${copied.length} budget${copied.length === 1 ? '' : 's'}.`, 2500)
    } catch (err) {
      toast.error(err?.message || 'Could not copy budgets.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-intro compact-intro">
        <div>
          <p className="eyebrow">The plan</p>
          <h1>Budgets.</h1>
          <p className="lead">
            {isCurrentMonth
              ? 'How the plan is holding up.'
              : 'Your plan for this month.'}
          </p>
        </div>
        <div className="budget-month-nav">
          <button className="icon-button" disabled={busy} onClick={() => setPeriodMonth(shiftMonth(periodMonth, -1))} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <span className="budget-month-label">{monthLabel(periodMonth)}</span>
          <button className="icon-button" disabled={busy} onClick={() => setPeriodMonth(shiftMonth(periodMonth, 1))} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {requestError && !dialog && <p className="error ledger-status" role="alert">{requestError}</p>}
      {!loading && progress.length > 0 && (
        <section className="card budget-summary">
          <div className="budget-summary-grid">
            <div><small>Allocated</small><strong>{money(totalLimit)}</strong></div>
            <div><small>Spent</small><strong>{money(totalSpent)}</strong></div>
            <div>
              <small>Remaining</small>
              <strong className={totalLimit - totalSpent < 0 ? 'red-text' : 'value-primary'}>
                {totalLimit - totalSpent < 0 ? '−' : ''}{money(totalLimit - totalSpent)}
              </strong>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <section className="card transaction-empty">
          <span className="eyebrow">Loading</span>
          <h2>Reading your plan.</h2>
        </section>
      ) : progress.length === 0 ? (
        <section className="card transaction-empty">
          <span className="empty-mark">//</span>
          <span className="eyebrow">No budgets</span>
          <h2>Nothing allocated yet.</h2>
          <p>Tell the app what each category gets this month.</p>
          <div className="budget-empty-actions">
            <button className="button lime" disabled={busy} onClick={() => setDialog({ mode: 'add' })}>
              <Plus size={16} /> Set a budget
            </button>
            <button className="button outline" disabled={busy} onClick={handleCopyPrevious}>
              <Copy size={16} /> Copy from last month
            </button>
          </div>
        </section>
      ) : (
        <section className="budget-list">
          {progress.map((b) => (
            <article className={`card budget-row budget-${b.tone}`} key={b.id}>
              <div className="budget-row-top">
                <div>
                  <span className="eyebrow">{b.category}</span>
                  <strong className="budget-amount">
                    {money(b.spent)} <span className="budget-amount-of">/ {money(b.monthly_limit)}</span>
                  </strong>
                </div>
                <div className="budget-row-actions">
                  <button className="icon-button" aria-label="Edit budget" onClick={() => setDialog({ mode: 'edit', budget: b })}>
                    <Pencil size={15} />
                  </button>
                  <button className="icon-button danger-button" aria-label="Delete budget" onClick={() => { setRequestError(''); setDialog({ mode: 'delete', budget: b }) }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="budget-bar">
                <i style={{ width: `${Math.min(100, b.percentage)}%` }} />
              </div>
              <div className="budget-row-meta">
                <span>{Math.round(b.percentage)}% used</span>
                <span className={b.remaining < 0 ? 'red-text' : ''}>
                  {b.remaining < 0 ? `${money(b.remaining)} over` : `${money(b.remaining)} left`}
                </span>
              </div>
            </article>
          ))}
          {unbudgetedCategories.length > 0 && (
            <button className="button outline budget-add-more" onClick={() => setDialog({ mode: 'add' })}>
              <Plus size={16} /> Add another category
            </button>
          )}
        </section>
      )}

      {dialog?.mode === 'add' && (
        <BudgetDialog categories={unbudgetedCategories} onSave={handleSave} onClose={() => setDialog(null)} />
      )}
      {dialog?.mode === 'edit' && (
        <BudgetDialog initial={dialog.budget} categories={[dialog.budget.category]} onSave={handleSave} onClose={() => setDialog(null)} />
      )}
      {dialog?.mode === 'delete' && (
        <Dialog label="Remove budget" busy={busy} onClose={() => setDialog(null)}>
            <div className="confirm-icon"><Trash2 size={20} /></div>
            <h2>Remove this budget?</h2>
            <p className="modal-copy">
              {dialog.budget.category} will no longer be tracked for {monthLabel(periodMonth)}.
            </p>
            {requestError && <p className="error" role="alert">{requestError}</p>}
            <div className="modal-actions">
              <button className="button outline" disabled={busy} onClick={() => setDialog(null)}>Cancel</button>
              <button className="button delete-button" disabled={busy} onClick={() => handleDelete(dialog.budget.id)}>
                {busy ? 'Removing…' : 'Remove budget'}
              </button>
            </div>
        </Dialog>
      )}
    </>
  )
}

function BudgetDialog({ initial, categories, onSave, onClose }) {
  const [category, setCategory] = useState(initial?.category || categories[0] || '')
  const [amount, setAmount] = useState(initial?.monthly_limit ? String(initial.monthly_limit) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(initial)

  const submit = async (event) => {
    event.preventDefault()
    const limit = Number(amount)
    if (!category) { setError('Pick a category.'); return }
    if (!Number.isFinite(limit) || limit <= 0) { setError('Enter an amount greater than zero.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ category, monthly_limit: limit })
    } catch (saveError) {
      setError(saveError.message || 'Could not save budget.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog label={isEdit ? 'Edit budget' : 'Set a budget'} busy={saving} onClose={onClose}>
        <div className="section-head">
          <h2>{isEdit ? 'Edit budget' : 'Set a budget'}</h2>
          <button className="icon-button" onClick={onClose} disabled={saving} aria-label="Close"><X size={18} /></button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <label>Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isEdit}>
              {categories.length === 0 && <option value="">No categories left</option>}
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Monthly limit (₹)
            <input required type="number" min="1" step="1" inputMode="numeric"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="button lime" disabled={saving}>
              {saving ? 'Saving…' : 'Save budget'} <Check size={16} />
            </button>
          </div>
        </form>
    </Dialog>
  )
}
