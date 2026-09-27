import { supabase } from './supabaseClient'

const PAYMENT_PATTERNS = [
  /(?:paid|sent)\s*(?:rs\.?|inr|\u20b9)?\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*([^\s,.]+)/i,
  /received\s*(?:rs\.?|inr|\u20b9)?\s*([\d,]+(?:\.\d{1,2})?)\s*from\s*([^\s,.]+)/i,
  /(?:rs\.?|inr|\u20b9)\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*([^\s,.]+)/i,
]

function parsePaymentNotification(rawText) {
  if (!rawText) return null
  for (const pattern of PAYMENT_PATTERNS) {
    const match = rawText.match(pattern)
    if (!match) continue
    const amount = parseFloat(match[1].replace(/,/g, ''))
    if (!isFinite(amount)) continue
    return {
      amount,
      merchant: match[2],
      type: /received|credited/i.test(rawText) ? 'income' : 'expense',
    }
  }
  return null
}

export async function processCapturedNotification(payload, userId) {
  if (!supabase || !userId) return
  const { packageName, text } = payload || {}
  const parsed = parsePaymentNotification(text)
  if (!parsed) {
    console.log('[Capture] Unrecognised notification text:', text)
    return
  }
  const row = {
    user_id: userId,
    source: 'notification',
    raw_text: text,
    package_name: packageName,
    merchant: parsed.merchant,
    amount: parsed.amount,
    type: parsed.type,
    transaction_date: new Date().toISOString().slice(0, 10),
    transaction_time: new Date().toTimeString().slice(0, 5),
    status: 'pending',
  }
  const { error } = await supabase.from('pending_transactions').insert([row])
  if (error) console.error('[Capture] Insert failed:', error)
  else console.log('[Capture] Stored pending transaction:', row)
}
