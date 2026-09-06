const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_TYPES = new Set(['income', 'expense'])
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other']
const PAYMENT_METHODS = ['UPI', 'Card', 'Net banking', 'Wallet', 'Cash', 'Other']
const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

const EXTRACTION_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'roastscan_payment',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        merchant: { type: ['string', 'null'] },
        amount: { type: ['number', 'null'] },
        type: { type: ['string', 'null'], enum: ['income', 'expense'] },
        category: { type: ['string', 'null'] },
        date: { type: ['string', 'null'], description: 'Transaction date as YYYY-MM-DD, else null' },
        time: { type: ['string', 'null'], description: 'Transaction time as HH:MM 24-hour, else null' },
        payment_method: { type: ['string', 'null'] },
        reference_id: { type: ['string', 'null'] },
        title: { type: ['string', 'null'] },
        confidence: { type: 'number' },
        notes: { type: ['string', 'null'] },
      },
      required: ['merchant', 'amount', 'type', 'category', 'date', 'time', 'payment_method', 'reference_id', 'title', 'confidence', 'notes'],
    },
  },
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const asString = (value, max = 180) => {
  if (value == null) return null
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (!text || ['null', 'undefined', 'unknown', 'n/a', 'na', 'none', '-'].includes(text.toLowerCase())) return null
  return text.slice(0, max)
}

const pick = (raw, keys) => {
  for (const key of keys) {
    if (raw?.[key] != null && raw[key] !== '') return raw[key]
  }
  return null
}

const asAmount = (value) => {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null
  }
  const text = String(value).replace(/[₹rsINR\s]/gi, '').replace(/,/g, '')
  const match = text.match(/(\d+(\.\d{1,2})?)/)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100) / 100
}

const pad = (value) => String(value).padStart(2, '0')

const asDate = (value) => {
  const text = asString(value, 32)
  if (!text) return null
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const ymd = text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
  if (ymd) return `${ymd[1]}-${pad(ymd[2])}-${pad(ymd[3])}`

  const dmy = text.match(/^(\d{1,2})[/-.](\d{1,2})[/-.](\d{2,4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    let year = Number(dmy[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
      return `${year}-${pad(month)}-${pad(day)}`
    }
  }

  const named = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/)
  if (named) {
    const month = MONTHS[named[2].toLowerCase()]
    let year = Number(named[3])
    if (year < 100) year += 2000
    const day = Number(named[1])
    if (month && day >= 1 && day <= 31) return `${year}-${pad(month)}-${pad(day)}`
  }

  return null
}

const asTime = (value) => {
  const text = asString(value, 12)
  if (!text) return null
  const ampm = text.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*([ap]m)?$/i)
  if (!ampm) return null
  let hours = Number(ampm[1])
  const minutes = Number(ampm[2])
  const meridian = ampm[3]?.toLowerCase()
  if (meridian === 'pm' && hours < 12) hours += 12
  if (meridian === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return `${pad(hours)}:${pad(minutes)}`
}

const asConfidence = (value) => {
  const confidence = Number(value)
  if (!Number.isFinite(confidence)) return 0
  const normalized = confidence > 1 ? confidence / 100 : confidence
  return Math.max(0, Math.min(1, Math.round(normalized * 100) / 100))
}

const sanitizeExtraction = (raw = {}) => {
  const typeValue = asString(pick(raw, ['type', 'transaction_type', 'direction']), 16)?.toLowerCase()
  const type = ALLOWED_TYPES.has(typeValue) ? typeValue : null
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const categoryValue = asString(pick(raw, ['category']), 40)
  const category = categoryValue && categories.includes(categoryValue) ? categoryValue : null
  const paymentValue = asString(pick(raw, ['payment_method', 'method', 'mode']), 40)
  const paymentMethod = PAYMENT_METHODS.includes(paymentValue) ? paymentValue : null
  const merchant = asString(pick(raw, ['merchant', 'payee', 'paid_to', 'receiver', 'name']), 120)
  const title = asString(pick(raw, ['title', 'label']), 120) || merchant
  const amount = asAmount(pick(raw, ['amount', 'transaction_amount', 'paid_amount', 'transfer_amount']))
  const confidence = asConfidence(raw.confidence)
  const unclear = amount == null || merchant == null || confidence < 0.55

  return {
    merchant,
    amount,
    type,
    date: asDate(pick(raw, ['date', 'transaction_date', 'paid_on'])),
    time: asTime(pick(raw, ['time', 'transaction_time', 'paid_at'])),
    payment_method: paymentMethod,
    reference_id: asString(pick(raw, ['reference_id', 'utr', 'upi_ref', 'transaction_id', 'ref_id']), 80),
    category,
    title,
    confidence,
    notes: asString(raw.notes, 280),
    unclear,
  }
}

const SYSTEM_PROMPT = `You extract ONE completed payment from an Indian payment screenshot (GPay, PhonePe, Paytm, BHIM, bank, card, UPI).
Return only the schema fields.
Rules:
- amount is the money sent or received in this transaction, never wallet/account/available balance.
- merchant is the other party (payee for expense, payer/sender for income). Never the user's own name if both appear.
- date is the transaction date, not a screenshot timestamp, app update date, or due date.
- time is the transaction time when visible.
- reference_id is UPI Ref / UTR / UPI transaction ID only. Never a mobile number, UPI ID, or account number.
- type is expense for paid/sent/debited, income for received/credited.
- category must match the allowed list or null.
- payment_method must match the allowed list or null.
- Use null when a field is not clearly visible. Never invent values.
- confidence is 0 to 1 for the payment amount and merchant together.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'Sign in to scan a payment screenshot.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: 'RoastScan is not configured on the server.' }, 500)
    }
    if (!openaiKey) {
      return json({ error: 'The vision extractor secret is not configured. Set OPENAI_API_KEY in Supabase secrets.' }, 500)
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userError || !userData?.user) {
      return json({ error: 'Your session expired. Sign in again to use RoastScan.' }, 401)
    }

    const body = await req.json()
    const mimeType = String(body?.mimeType || 'image/jpeg').toLowerCase()
    const imageBase64 = String(body?.imageBase64 || '').replace(/\s/g, '')

    if (!mimeType.startsWith('image/')) return json({ error: 'Only image screenshots can be scanned.' }, 400)
    if (!imageBase64 || imageBase64.length < 32) return json({ error: 'The screenshot was empty.' }, 400)
    if (imageBase64.length > 1_800_000) {
      return json({ error: 'The screenshot is too large to scan. Crop to the payment receipt and try again.' }, 413)
    }

    const payload = {
      model: 'gpt-4o',
      temperature: 0,
      response_format: EXTRACTION_SCHEMA,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the completed payment from this screenshot.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
          ],
        },
      ],
    }

    let openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!openaiResponse.ok) {
      payload.response_format = { type: 'json_object' }
      payload.messages[0] = {
        role: 'system',
        content: `${SYSTEM_PROMPT}
Return a JSON object with keys merchant, amount, type, category, date, time, payment_method, reference_id, title, confidence, notes. Use null when unknown.`,
      }
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    }

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text()
      console.error('[roastscan-extract] OpenAI error', openaiResponse.status, detail.slice(0, 500))
      return json({ error: 'The vision extractor is temporarily unavailable. Enter the transaction manually.' }, 502)
    }

    const openaiJson = await openaiResponse.json()
    const content = openaiJson?.choices?.[0]?.message?.content
    let parsed = {}
    try {
      const text = String(content || '').trim()
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
      parsed = JSON.parse((fenced ? fenced[1] : text) || '{}')
    } catch {
      return json({ error: 'The extractor returned an unreadable result. Enter the transaction manually.' }, 502)
    }

    return json({ extraction: sanitizeExtraction(parsed) })
  } catch (error) {
    console.error('[roastscan-extract]', error)
    return json({ error: 'RoastScan could not read that screenshot. Enter the transaction manually.' }, 500)
  }
})
