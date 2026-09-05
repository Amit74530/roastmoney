import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ImageUp, ScanSearch } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ShareReceiver, isNativeShareReceiverAvailable, toDisplayableShare } from '../plugins/shareReceiver'
import { extractRoastScanImage } from '../lib/roastscanService'
import { findLikelyDuplicates } from '../lib/duplicateTransactions'
import { categoriesForType, paymentMethods } from '../lib/transactionCategories'
import { localDateInputValue } from '../utils/localDate'

const emptyShare = {
  status: 'loading',
  share: null,
}

const emptyForm = () => ({
  title: '',
  merchant: '',
  amount: '',
  type: 'expense',
  category: 'Food',
  transaction_date: localDateInputValue(),
  time: '',
  payment_method: 'UPI',
  reference_id: '',
  description: '',
})

const confidenceLabel = (value) => {
  if (value >= 0.8) return 'High'
  if (value >= 0.55) return 'Medium'
  return 'Low'
}

function formFromExtraction(extraction) {
  const type = extraction?.type === 'income' ? 'income' : 'expense'
  const categories = categoriesForType(type)
  const category = categories.includes(extraction?.category) ? extraction.category : 'Other'
  return {
    ...emptyForm(),
    title: extraction?.title || extraction?.merchant || '',
    merchant: extraction?.merchant || extraction?.title || '',
    amount: extraction?.amount == null ? '' : String(extraction.amount),
    type,
    category,
    transaction_date: extraction?.date || localDateInputValue(),
    time: extraction?.time || '',
    payment_method: paymentMethods.includes(extraction?.payment_method) ? extraction.payment_method : 'Other',
    reference_id: extraction?.reference_id || '',
    description: extraction?.notes || '',
  }
}

export default function RoastScan({ transactions = [], onSave }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [shareState, setShareState] = useState(emptyShare)
  const [extractStatus, setExtractStatus] = useState('idle')
  const [extractError, setExtractError] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)
  const [roast, setRoast] = useState(null)
  const [saved, setSaved] = useState(false)

  const share = shareState.share
  const received = Boolean(share?.received && share?.webPath)
  const categories = categoriesForType(form.type)
  const confidence = Number(extraction?.confidence)
  const lowConfidence = !extraction || extraction.unclear || !Number.isFinite(confidence) || confidence < 0.55

  useEffect(() => {
    let active = true
    setShareState(emptyShare)
    setExtractStatus('idle')
    setExtractError('')
    setExtraction(null)
    setForm(emptyForm())
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
            share: {
              received: false,
              error: 'unavailable',
              message: 'Share a payment screenshot to the Android app to start RoastScan.',
            },
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
          share: {
            received: false,
            error: 'missing_stream',
            message: 'No shared image is waiting. Share a payment screenshot to ROAST.MONEY.',
          },
        })
      } catch (error) {
        console.error('[RoastScan] Failed to read pending share:', error)
        if (active) {
          setShareState({
            status: 'error',
            share: {
              received: false,
              error: 'unreadable',
              message: 'The shared image could not be opened.',
            },
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
    try {
      const upload = await ShareReceiver.readPendingShareForUpload()
      const result = await extractRoastScanImage({
        imageBase64: upload.imageBase64,
        mimeType: upload.mimeType || 'image/jpeg',
      })
      setExtraction(result)
      setForm(formFromExtraction(result))
      setExtractStatus('ready')
    } catch (error) {
      console.error('[RoastScan] extract failed:', error)
      setExtraction(null)
      setForm(emptyForm())
      setExtractStatus('fallback')
      setExtractError(error?.message || 'RoastScan could not read that screenshot. Enter the details manually.')
    }
  }

  useEffect(() => {
    if (shareState.status === 'ready' && shareState.share?.received) {
      runExtract()
    }
    // Intentionally only when a new share payload arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareState.status, shareState.share?.id])

  const update = (key, value) => {
    setForm((current) => {
      if (key === 'type') {
        return { ...current, type: value, category: value === 'income' ? 'Salary' : 'Food' }
      }
      return { ...current, [key]: value }
    })
  }

  const payloadFromForm = () => ({
    title: (form.title || form.merchant).trim(),
    merchant: (form.merchant || form.title).trim(),
    amount: Number(form.amount),
    type: form.type,
    category: form.category,
    transaction_date: form.transaction_date,
    time: form.time,
    payment_method: form.payment_method,
    reference_id: form.reference_id.trim(),
    description: form.description.trim(),
    source: 'roastscan',
    scan_confidence: Number.isFinite(confidence) ? confidence : null,
  })

  const likelyDuplicates = useMemo(() => findLikelyDuplicates(transactions, payloadFromForm()), [transactions, form])

  const saveTransaction = async () => {
    const payload = payloadFromForm()
    if (!payload.title || !payload.transaction_date || !Number.isFinite(payload.amount) || payload.amount <= 0) {
      setSaveError('Enter a merchant, date, and amount greater than zero before saving.')
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
      if (isNativeShareReceiverAvailable()) {
        await ShareReceiver.clearPendingShare()
      }
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

  const native = Capacitor.isNativePlatform()

  return (
    <>
      <div className="page-intro compact-intro">
        <div>
          <p className="eyebrow">RoastScan / phase 2</p>
          <h1>Review the extracted payment.</h1>
          <p className="lead">Nothing is saved until you confirm. Low-confidence reads stay editable.</p>
        </div>
      </div>

      <section className="card roastscan-card">
        <div className="roastscan-status">
          <span className="eyebrow">{received ? 'Inbound screenshot' : 'Share status'}</span>
          <h2>
            {extractStatus === 'working'
              ? 'Reading the screenshot…'
              : received
                ? (lowConfidence ? 'Check these fields before saving.' : 'Extraction ready for review.')
                : share?.message || 'Waiting for a shared image.'}
          </h2>
          <p>
            {received
              ? 'The image is sent to a server-side vision function. The AI key never ships in the app.'
              : native
                ? 'Share an image from another app and choose ROAST.MONEY.'
                : 'Open this flow from the installed Android app to receive a shared screenshot.'}
          </p>
        </div>
        <div className={`roastscan-badge ${received && extractStatus === 'ready' && !lowConfidence ? 'ok' : 'warn'}`}>
          <ScanSearch size={18} />
          {extractStatus === 'working'
            ? 'Extracting'
            : extractStatus === 'ready'
              ? `${confidenceLabel(confidence)} · ${Math.round((confidence || 0) * 100)}%`
              : received
                ? 'Manual review'
                : 'No extractable image'}
        </div>
      </section>

      {received ? (
        <figure className="card roastscan-preview-card">
          <img className="roastscan-preview" src={share.webPath} alt={share.fileName || 'Shared payment screenshot'} />
          <figcaption>
            <ImageUp size={14} />
            <span>{share.fileName}</span>
            {share.mimeType ? <span className="roastscan-mime">{share.mimeType}</span> : null}
          </figcaption>
        </figure>
      ) : shareState.status !== 'loading' ? (
        <section className="card roastscan-empty">
          <p className="error">{share?.message || 'Unsupported or unreadable shared content.'}</p>
        </section>
      ) : null}

      {received && (
        <section className="card roastscan-form-card">
          {(extractError || lowConfidence && extractStatus !== 'working') && (
            <p className="roastscan-banner">{extractError || 'This screenshot was unclear. Edit the fields or fill them in yourself.'}</p>
          )}
          <form className="modal-form roastscan-form" onSubmit={handleSave}>
            <div className="transaction-type-toggle">
              <button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => update('type', 'income')}>Income</button>
              <button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => update('type', 'expense')}>Expense</button>
            </div>
            <label>Merchant / title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, merchant: event.target.value }))} placeholder="Payee or merchant" /></label>
            <label>Amount (₹)<input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => update('amount', event.target.value)} /></label>
            <div className="form-row">
              <label>Category
                <select value={form.category} onChange={(event) => update('category', event.target.value)}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>Payment method
                <select value={form.payment_method} onChange={(event) => update('payment_method', event.target.value)}>
                  {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>Date<input required type="date" value={form.transaction_date} onChange={(event) => update('transaction_date', event.target.value)} /></label>
              <label>Time <span className="optional">optional</span><input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} /></label>
            </div>
            <label>Reference / UTR <span className="optional">optional</span><input value={form.reference_id} onChange={(event) => update('reference_id', event.target.value)} placeholder="UPI or bank reference" /></label>
            <label>Notes <span className="optional">optional</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Anything the screenshot did not make obvious" /></label>
            {saveError && <p className="error">{saveError}</p>}
            {confirmDuplicate && duplicates.length > 0 && (
              <div className="roastscan-duplicate" role="status">
                <strong>Possible duplicate</strong>
                <p>{duplicates[0].title} · ₹{Math.round(Number(duplicates[0].amount) || 0)} on {duplicates[0].transaction_date}. Save anyway only if this is a new payment.</p>
              </div>
            )}
            {saved && (
              <div className="roastscan-saved" role="status">
                <Check size={16} />
                <div>
                  <strong>Saved to your ledger.</strong>
                  {roast?.text ? <p className="roast-quote">{roast.text}</p> : <p>No roast this time — income stays un-roasted.</p>}
                </div>
              </div>
            )}
            <div className="modal-actions roastscan-actions">
              <button type="button" className="button outline" onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /> Home</button>
              {received && extractStatus !== 'working' && !saved && (
                <button type="button" className="button outline" onClick={runExtract} disabled={extractStatus === 'working'}>Retry scan</button>
              )}
              {saved ? (
                <Link className="button lime" to="/transactions">View activity</Link>
              ) : (
                <button className="button lime" disabled={saving || extractStatus === 'working'}>
                  {saving ? 'Saving…' : confirmDuplicate ? 'Save anyway' : 'Save transaction'}
                  <Check size={16} />
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {!received && (
        <div className="roastscan-actions">
          <Link className="button outline" to="/dashboard"><ArrowLeft size={16} /> Back to home</Link>
        </div>
      )}
    </>
  )
}
