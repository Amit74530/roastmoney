import { useState } from 'react'
import { Check, X } from 'lucide-react'

const incomeCategories = ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
const expenseCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other']

export default function TransactionModal({ type = 'expense', onSave, onClose }) {
  const [form, setForm] = useState({ type, description: '', amount: '', category: type === 'income' ? 'Salary' : 'Food', date: new Date().toISOString().slice(0, 10), notes: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const categories = form.type === 'income' ? incomeCategories : expenseCategories
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.description.trim() || !form.date || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description, date, and amount greater than zero.')
      return
    }
    try {
      setLoading(true)
      setError('')
      await onSave({ ...form, merchant: form.description.trim(), description: form.description.trim(), amount })
    } catch (saveError) {
      setError(saveError?.message || 'We could not save this transaction.')
      setLoading(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="section-head"><div><span className="eyebrow">NEW LEDGER ENTRY</span><h2>ADD TRANSACTION</h2></div><button className="icon-button" onClick={onClose} aria-label="Close transaction form"><X size={18} /></button></div><form className="modal-form" onSubmit={submit}><div className="transaction-type-toggle"><button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => { update('type', 'income'); update('category', 'Salary') }}>INCOME</button><button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => { update('type', 'expense'); update('category', 'Food') }}>EXPENSE</button></div><label>Description<input required autoFocus value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Monthly salary or dinner out" /></label><label>Amount (₹)<input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => update('amount', event.target.value)} /></label><div className="form-row"><label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Date<input required type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></label></div><label>Notes <span className="optional">OPTIONAL</span><textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="A little context never hurt anyone" /></label>{error && <p className="error">{error}</p>}<div className="modal-actions"><button type="button" className="button outline" onClick={onClose}>CANCEL</button><button className="button lime" disabled={loading}>{loading ? 'SAVING…' : 'SAVE TRANSACTION'} <Check size={16} /></button></div></form></div></div>
}
