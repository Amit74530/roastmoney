import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Pencil, ScanSearch } from 'lucide-react'
import { ShareReceiver, isNativeShareReceiverAvailable, toDisplayableShare } from '../plugins/shareReceiver'
import { extractRoastScanImage, imageSourceToUpload } from '../lib/roastscanService'
import { confidenceCopy, emptyForm, mapExtractionToForm } from '../lib/roastscanMapping'
import { findLikelyDuplicates } from '../lib/duplicateTransactions'
import { categoriesForType, paymentMethods } from '../lib/transactionCategories'

const money = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '₹—'
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function RoastScan({ transactions = [], onSave }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [shareState, setShareState] = useState({ status: 'loading', share: null })
  const [extractStatus, setExtractStatus] = useState('idle')
  const [extractError, setExtractError] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)
  const [roast, setRoast] = useState(null)
  const [saved, setSaved] = useState(false)

  const share = shareState.share
  const received = Boolean(share?.received && (share.webPath || share.path))
  const categories = categoriesForType(form.type || 'expense')
  const confidence = confidenceCopy(extraction)

  useEffect(() => {
    let active = true
    setShareState({ status: 'loading', share: null })
    setExtractStatus('idle')
    setExtractError('')
    setExtraction(null)
    setForm(emptyForm())
    setEditing(false)
    setSaveError('')
    setDuplicates([])
    setConfirmDuplicate(false)
    setRoast(null)
    setSaved(false)

    const loadPending = async () => {
      if (!isNativeShareReceiverAvailable()) {
        if (active) {
          setShareState({
            status: 'unavailable',
            share: { received: false, message: 'Share a payment screenshot to RoastMoney on Android to start RoastScan.' },
          })
        }
        return
      }

      try {
        const pending = toDisplayableShare(await ShareReceiver.getPendingShare())
        if (!active) return
        if (pending?.received || pending?.error) {
          setShareState({ status: pending.received ? 'ready' : 'error', share: pending })
          return
        }
        setShareState({
          status: 'empty',
          share: { received: false, message: 'No shared image is waiting. Share a payment screenshot to RoastMoney.' },
        })
      } catch (error) {
        console.error('[RoastScan] Failed to read pending share:', error)
        if (active) {
          setShareState({
            status: 'error',
            share: { received: false, message: 'The shared image could not be opened.' },
          })
        }
      }
    }

    loadPending()
    return () => { active = false }
  }, [location.search])

  const runExtract = async () => {
    if (!received) return
    setExtractStatus('working')
    setExtractError('')
    setSaved(false)
    setRoast(null)
    setConfirmDuplicate(false)
    setSaveError('')
    setEditing(false)
    try {
      let prepared
      try {
        const upload = toDisplayableShare(await ShareReceiver.readPendingShareForUpload())
        prepared = await imageSourceToUpload({
          webPath: upload?.webPath,
          mimeType: upload?.mimeType,
        })
      } catch (nativeError) {
        console.warn('[RoastScan] Native JPEG copy unavailable, using preview fetch.', nativeError)
        prepared = await imageSourceToUpload({ webPath: share.webPath })
      }
      const result = await extractRoastScanImage(prepared)
      setExtraction(result)
      setForm(mapExtractionToForm(result))
      setExtractStatus('ready')
      setEditing(!(result?.merchant && result?.amount))
    } catch (error) {
      console.error('[RoastScan] extract failed:', error)
      setExtraction(null)
      setForm(emptyForm())
      setExtractStatus('fallback')
      setEditing(true)
      setExtractError(error?.message || 'RoastScan could not read that screenshot. Enter the details manually.')
    }
  }

  useEffect(() => {
    if (shareState.status === 'ready' && shareState.share?.received) {
      runExtract()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareState.status, shareState.share?.id])

  const update = (key, value) => {
    setForm((current) => {
      if (key === 'type') {
        return { ...current, type: value, category: '' }
      }
      return { ...current, [key]: value }
    })
  }

  const payloadFromForm = () => ({
    title: (form.title || form.merchant).trim(),
    merchant: (form.merchant || form.title).trim(),
    amount: Number(form.amount),
    type: form.type === 'income' ? 'income' : 'expense',
    category: form.category || 'Other',
    transaction_date: form.transaction_date,
    time: form.time,
    payment_method: form.payment_method,
    reference_id: (form.reference_id || '').trim(),
    description: (form.description || '').trim(),
    source: 'roastscan',
    scan_confidence: Number.isFinite(Number(extraction?.confidence)) ? Number(extraction.confidence) : null,
  })

  const likelyDuplicates = useMemo(
    () => findLikelyDuplicates(transactions, payloadFromForm()),
    [transactions, form],
  )

  const saveTransaction = async () => {
    const payload = payloadFromForm()
    if (!payload.title || !payload.transaction_date || !Number.isFinite(payload.amount) || payload.amount <= 0) {
      setSaveError('Enter a merchant, date, and amount greater than zero before saving.')
      setEditing(true)
      return
    }
    if (!onSave) {
      setSaveError('You must be signed in to save this transaction.')
      return
    }
    try {
      setSaving(true)
      setSaveError('')
      const result = await onSave(payload)
      setRoast(result?.roast || null)
      setSaved(true)
      setConfirmDuplicate(false)
      if (isNativeShareReceiverAvailable()) await ShareReceiver.clearPendingShare()
    } catch (error) {
      setSaveError(error?.message || 'The transaction was not saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (likelyDuplicates.length && !confirmDuplicate) {
      setDuplicates(likelyDuplicates)
      setConfirmDuplicate(true)
      return
    }
    await saveTransaction()
  }

  const scanning = extractStatus === 'working'
  const ready = extractStatus === 'ready' || extractStatus === 'fallback'

  return (
    <div className="roastscan">
      {!received && shareState.status !== 'loading' && (
        <section className="card roastscan-empty">
          <ScanSearch size={22} />
          <h1>Waiting for a screenshot.</h1>
          <p>{share?.message || 'Share a payment screenshot and choose RoastMoney.'}</p>
          <Link className="button outline" to="/dashboard"><ArrowLeft size={16} /> Back</Link>
        </section>
      )}

      {received && (
        <form className="roastscan-layout" onSubmit={handleSave}>
          <section className="card roastscan-hero">
            {share.webPath && (
              <figure className="roastscan-thumb">
                <img src={share.webPath} alt="Shared payment screenshot" />
              </figure>
            )}
            <div className="roastscan-hero-copy">
              <p className="eyebrow">{scanning ? 'Analyzing screenshot' : saved ? 'Saved' : 'Payment scan'}</p>
              <strong className="roastscan-amount">{scanning ? 'Reading…' : money(form.amount)}</strong>
              <p className="roastscan-merchant">{form.merchant || (scanning ? 'Looking for the payee' : 'Merchant not found')}</p>
              <span className={`roastscan-confidence ${confidence.tone}`}>{confidence.label}</span>
            </div>
          </section>

          {scanning && (
            <section className="card roastscan-status-card" role="status">
              <p>ROAST.MONEY is reading merchant, amount, date, and reference from the screenshot. Nothing is saved yet.</p>
            </section>
          )}

          {extractError && <p className="roastscan-banner">{extractError}</p>}

          {ready && !saved && (
            <>
              {!editing && (
                <section className="card roastscan-summary">
                  <dl>
                    <div><dt>Type</dt><dd>{form.type === 'income' ? 'Income' : 'Expense'}</dd></div>
                    <div><dt>Category</dt><dd>{form.category || '—'}</dd></div>
                    <div><dt>Date</dt><dd>{form.transaction_date || '—'}</dd></div>
                    <div><dt>Time</dt><dd>{form.time || '—'}</dd></div>
                    <div><dt>Method</dt><dd>{form.payment_method || '—'}</dd></div>
                    <div><dt>Reference</dt><dd>{form.reference_id || '—'}</dd></div>
                  </dl>
                  <p className="roastscan-hint">{confidence.detail}</p>
                </section>
              )}

              {editing && (
                <section className="card roastscan-edit">
                  <div className="transaction-type-toggle">
                    <button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => update('type', 'income')}>Income</button>
                    <button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => update('type', 'expense')}>Expense</button>
                  </div>
                  <label>Merchant<input value={form.merchant} onChange={(event) => setForm((current) => ({ ...current, merchant: event.target.value, title: event.target.value }))} placeholder="Payee or merchant" /></label>
                  <label>Amount (₹)<input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => update('amount', event.target.value)} /></label>
                  <div className="form-row">
                    <label>Category
                      <select value={form.category} onChange={(event) => update('category', event.target.value)}>
                        <option value="">Select</option>
                        {categories.map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </label>
                    <label>Payment method
                      <select value={form.payment_method} onChange={(event) => update('payment_method', event.target.value)}>
                        <option value="">Select</option>
                        {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="form-row">
                    <label>Date<input required type="date" value={form.transaction_date} onChange={(event) => update('transaction_date', event.target.value)} /></label>
                    <label>Time<input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} /></label>
                  </div>
                  <label>Reference / UTR<input value={form.reference_id} onChange={(event) => update('reference_id', event.target.value)} placeholder="UPI Ref or UTR" /></label>
                </section>
              )}

              {confirmDuplicate && duplicates.length > 0 && (
                <div className="roastscan-duplicate" role="status">
                  <strong>Possible duplicate</strong>
                  <p>{duplicates[0].title} · {money(duplicates[0].amount)} on {duplicates[0].transaction_date}.</p>
                </div>
              )}
              {saveError && <p className="error">{saveError}</p>}

              <div className="roastscan-actions">
                <button type="button" className="button outline" onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /> Back</button>
                <button type="button" className="button outline" onClick={runExtract} disabled={scanning}>Try again</button>
                <button type="button" className="button outline" onClick={() => setEditing((current) => !current)}>
                  <Pencil size={15} /> {editing ? 'View summary' : 'Edit details'}
                </button>
                <button className="button lime" disabled={saving || scanning}>
                  {saving ? 'Saving…' : confirmDuplicate ? 'Save anyway' : 'Save transaction'}
                  <Check size={16} />
                </button>
              </div>
            </>
          )}

          {saved && (
            <section className="card roastscan-saved" role="status">
              <Check size={18} />
              <div>
                <strong>Saved to your ledger.</strong>
                {roast?.text ? <p className="roast-quote">{roast.text}</p> : <p>Income stays un-roasted. The evidence is logged.</p>}
              </div>
              <Link className="button lime" to="/transactions">View activity</Link>
            </section>
          )}
        </form>
      )}
    </div>
  )
}
