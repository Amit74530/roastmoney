import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { expenseCategories, incomeCategories } from '../lib/transactionCategories'
import { localDateInputValue, localTimeInputValue } from '../utils/localDate'

const money = (value) => `₹${Math.round(Math.abs(value)).toLocaleString('en-IN')}`
const emptyForm = () => ({
  title: '',
  amount: '',
  type: 'expense',
  category: 'Food',
  transaction_date: localDateInputValue(),
  time: localTimeInputValue(),
  description: '',
})

function TransactionForm({ initial, onSave, onClose, loading = false }) {
  const [form, setForm] = useState({
    ...emptyForm(),
    ...initial,
    title: initial?.title || initial?.merchant || '',
    transaction_date: initial?.transaction_date || initial?.date || localDateInputValue(),
    time: initial?.time || localTimeInputValue(),
    description: initial?.description || initial?.notes || '',
    type: initial?.type || 'expense',
  })
  const [error, setError] = useState('')
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const categoryOptions = form.type === 'income' ? incomeCategories : expenseCategories
  const submit = (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.title.trim() || !form.transaction_date || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a title, date, and amount greater than zero.')
      return
    }
    setError('')
    onSave({
      title: form.title.trim(),
      description: (form.description || '').trim(),
      amount,
      type: form.type,
      category: form.category,
      transaction_date: form.transaction_date,
    })
  }
  return (
    <form className="modal-form" onSubmit={submit}>
      <label>Merchant / name<input required value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
      <label>Amount (₹)<input required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update('amount', event.target.value)} /></label>
      <div className="form-row">
        <label>Type
          <select value={form.type} onChange={(event) => {
            const nextType = event.target.value
            setForm((current) => ({ ...current, type: nextType, category: nextType === 'income' ? 'Salary' : 'Food' }))
          }}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>Category
          <select value={form.category} onChange={(event) => update('category', event.target.value)}>
            {categoryOptions.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>Date<input required type="date" value={form.transaction_date} onChange={(event) => update('transaction_date', event.target.value)} /></label>
        <label>Time<input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} /></label>
      </div>
      <label>Notes <span className="optional">optional</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Add context for future you" /></label>
      {error && <p className="error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button outline" onClick={onClose}>Cancel</button>
        <button className="button lime" disabled={loading}>{loading ? 'Saving…' : 'Save transaction'} <Check size={16} /></button>
      </div>
    </form>
  )
}

function Overlay({ children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>
}

function EmptyResults({ filtered, clear, openAdd }) {
  return (
    <div className="transaction-empty">
      <span className="empty-mark">//</span>
      <span className="eyebrow">{filtered ? 'Search / no match' : 'Ledger / empty'}</span>
      <h2>{filtered ? 'No transactions match.' : 'Your financial history starts here.'}</h2>
      <p>{filtered ? 'Try a different search or clear the filters.' : 'Start documenting your money.'}</p>
      <button className="button lime" onClick={filtered ? clear : openAdd}>{filtered ? 'Clear filters' : 'Add transaction'} <Plus size={16} /></button>
    </div>
  )
}

export default function TransactionManager({ transactions, loading: fetching, fetchError, onCreateTransaction, onUpdateTransaction, onDeleteTransaction }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [month, setMonth] = useState('')
  const [sort, setSort] = useState('newest')
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setDialog({ mode: 'add' })
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const filtered = useMemo(() => [...transactions].filter((item) => {
    const needle = search.toLowerCase()
    const title = (item.title || '').toLowerCase()
    const itemCategory = (item.category || '').toLowerCase()
    const itemDate = item.transaction_date || ''
    return (!needle || title.includes(needle) || itemCategory.includes(needle))
      && (type === 'all' || (item.type || 'expense') === type)
      && (category === 'all' || item.category === category)
      && (!month || itemDate.startsWith(month))
  }).sort((first, second) => {
    if (sort === 'highest') return Math.abs(Number(second.amount || 0)) - Math.abs(Number(first.amount || 0))
    if (sort === 'lowest') return Math.abs(Number(first.amount || 0)) - Math.abs(Number(second.amount || 0))
    const firstDate = first.transaction_date || ''
    const secondDate = second.transaction_date || ''
    return sort === 'oldest' ? firstDate.localeCompare(secondDate) : secondDate.localeCompare(firstDate)
  }), [transactions, search, type, category, month, sort])

  const clear = () => { setSearch(''); setType('all'); setCategory('all'); setMonth(''); setSort('newest') }
  const save = async (form) => {
    try {
      setLoading(true)
      setError('')
      if (dialog?.transaction) {
        await onUpdateTransaction(dialog.transaction.id, form)
        setNotice('Transaction updated.')
        window.setTimeout(() => setNotice(''), 2200)
      } else {
        const result = await onCreateTransaction(form)
        setNotice(result?.roast?.text || 'Transaction added.')
        window.setTimeout(() => setNotice(''), result?.roast ? 5200 : 2200)
      }
      setDialog(null)
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save this transaction.')
    } finally {
      setLoading(false)
    }
  }
  const remove = async () => {
    try {
      setLoading(true)
      setError('')
      await onDeleteTransaction(dialog.transaction.id)
      setDialog(null)
      setNotice('Transaction deleted.')
      window.setTimeout(() => setNotice(''), 2200)
    } catch (deleteError) {
      setError(deleteError?.message || 'Unable to delete this transaction.')
    } finally {
      setLoading(false)
    }
  }
  const hasFilters = Boolean(search || type !== 'all' || category !== 'all' || month)

  return (
    <>
      <div className="page-intro compact-intro">
        <div>
          <p className="eyebrow">The full damage report</p>
          <h1>Activity</h1>
          <p className="lead">Every decision. Unfortunately documented.</p>
        </div>
        <button className="button lime" onClick={() => setDialog({ mode: 'add' })}><Plus size={17} /> Add transaction</button>
      </div>
      <div className="transaction-tools">
        <div className="search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant or category" /></div>
        <select aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {[...new Set([...incomeCategories, ...expenseCategories])].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input aria-label="Filter by month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <select aria-label="Sort transactions" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </select>
      </div>
      {notice && <div className="success-notice"><Check size={15} /> {notice}</div>}
      {fetchError && <p className="error">{fetchError}</p>}
      {error && <p className="error">{error}</p>}
      <section className="card transaction-card advanced-list">
        <div className="transaction-list-head">
          <span>Merchant</span><span>Category / date</span><span>Type</span><span>Amount</span><span>Actions</span>
        </div>
        {fetching ? (
          <div className="transaction-empty"><span className="eyebrow">Ledger / loading</span><h2>Reading your financial history.</h2></div>
        ) : filtered.length ? filtered.map((item) => {
          const income = item.type === 'income'
          return (
            <div className="advanced-row" key={item.id}>
              <div className="merchant-cell"><div className="merchant-icon">{(item.category || 'OT').slice(0, 2).toUpperCase()}</div><strong>{item.title || 'Transaction'}</strong></div>
              <div className="category-cell"><span>{item.category || 'Other'}</span><small>{item.transaction_date}</small></div>
              <span className={`type-pill ${income ? 'income' : 'expense'}`}>{income ? 'Income' : 'Expense'}</span>
              <strong className={`advanced-amount ${income ? 'income-text' : ''}`}>{income ? '+' : '-'}{money(item.amount)}</strong>
              <div className="row-actions">
                <button className="icon-button" title="Edit transaction" onClick={() => setDialog({ mode: 'edit', transaction: item })}><Pencil size={15} /></button>
                <button className="icon-button danger-button" title="Delete transaction" onClick={() => setDialog({ mode: 'delete', transaction: item })}><Trash2 size={15} /></button>
              </div>
            </div>
          )
        }) : <EmptyResults filtered={hasFilters} clear={clear} openAdd={() => setDialog({ mode: 'add' })} />}
      </section>
      {dialog?.mode === 'delete' && (
        <Overlay onClose={() => setDialog(null)}>
          <div className="confirm-icon"><Trash2 size={20} /></div>
          <h2>Delete this transaction?</h2>
          <p className="modal-copy">{dialog.transaction.title} will be removed permanently. This action cannot be undone.</p>
          <div className="modal-actions">
            <button className="button outline" onClick={() => setDialog(null)}>Cancel</button>
            <button className="button delete-button" disabled={loading} onClick={remove}>{loading ? 'Deleting…' : 'Delete transaction'}</button>
          </div>
        </Overlay>
      )}
      {dialog?.mode === 'add' && (
        <Overlay onClose={() => setDialog(null)}>
          <div className="section-head"><h2>Add transaction</h2><button className="icon-button" onClick={() => setDialog(null)}><X size={18} /></button></div>
          <TransactionForm onSave={save} onClose={() => setDialog(null)} loading={loading} />
        </Overlay>
      )}
      {dialog?.mode === 'edit' && (
        <Overlay onClose={() => setDialog(null)}>
          <div className="section-head"><h2>Edit transaction</h2><button className="icon-button" onClick={() => setDialog(null)}><X size={18} /></button></div>
          <TransactionForm initial={dialog.transaction} onSave={save} onClose={() => setDialog(null)} loading={loading} />
        </Overlay>
      )}
    </>
  )
}
