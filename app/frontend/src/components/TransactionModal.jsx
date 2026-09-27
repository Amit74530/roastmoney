import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { categoriesForType } from '../lib/transactionCategories'
import { localDateInputValue } from '../utils/localDate'

export default function TransactionModal({ type = 'expense', onSave, onClose }) {
  const [form, setForm] = useState({
    type,
    title: '',
    amount: '',
    category: type === 'income' ? 'Salary' : 'Food',
    transaction_date: localDateInputValue(),
    description: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const categories = categoriesForType(form.type)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.title.trim() || !form.transaction_date || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description, date, and amount greater than zero.')
      return
    }
    try {
      setLoading(true)
      setError('')
      await onSave({
        title: form.title.trim(),
        description: (form.description || '').trim(),
        amount,
        type: form.type,
        category: form.category,
        transaction_date: form.transaction_date,
      })
    } catch (saveError) {
      setError(saveError?.message || 'We could not save this transaction.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <span className="eyebrow">New ledger entry</span>
            <h2>Add transaction</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close transaction form"><X size={18} /></button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <div className="transaction-type-toggle">
            <button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => { update('type', 'income'); update('category', 'Salary') }}>Income</button>
            <button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => { update('type', 'expense'); update('category', 'Food') }}>Expense</button>
          </div>
          <label>Description<input required autoFocus value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Monthly salary or dinner out" /></label>
          <label>Amount (₹)<input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => update('amount', event.target.value)} /></label>
          <div className="form-row">
            <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Date<input required type="date" value={form.transaction_date} onChange={(event) => update('transaction_date', event.target.value)} /></label>
          </div>
          <label>Notes <span className="optional">optional</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="A little context never hurt anyone" /></label>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button outline" onClick={onClose}>Cancel</button>
            <button className="button lime" disabled={loading}>{loading ? 'Saving…' : 'Save transaction'} <Check size={16} /></button>
          </div>
        </form>
      </div>
    </div>
  )
}
