const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_TYPES = ['income', 'expense']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other']
const PAYMENT_METHODS = ['UPI', 'Card', 'Net banking', 'Wallet', 'Cash', 'Other']
const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
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
    if (raw && raw[key] != null && raw[key] !== '') return raw[key]
  }
  return null
}

const asAmount = (value) => {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null
  }
  const text = String(value).replace(/[\u20B9rsINR\s]/gi, '').replace(/,/g, '')
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
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3]

  const ymd = text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
  if (ymd) return ymd[1] + '-' + pad(ymd[2]) + '-' + pad(ymd[3])

  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    let year = Number(dmy[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
      return year + '-' + pad(month) + '-' + pad(day)
    }
  }

  const named = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/)
  if (named) {
    const month = MONTHS[named[2].toLowerCase()]
    let year = Number(named[3])
    if (year < 100) year += 2000
    const day = Number(named[1])
    if (month && day >= 1 && day <= 31) return year + '-' + pad(month) + '-' + pad(day)
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
  const meridian = ampm[3] ? ampm[3].toLowerCase() : ''
  if (meridian === 'pm' && hours < 12) hours += 12
  if (meridian === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return pad(hours) + ':' + pad(minutes)
}

const asConfidence = (value) => {
  const confidence = Number(value)
  if (!Number.isFinite(confidence)) return 0
  const normalized = confidence > 1 ? confidence / 100 : confidence
  return Math.max(0, Math.min(1, Math.round(normalized * 100) / 100))
}

const sanitizeExtraction = (raw) => {
  const source = raw || {}
  const typeValue = asString(pick(source, ['type', 'transaction_type', 'direction']), 16)
  const type = typeValue && ALLOWED_TYPES.includes(typeValue.toLowerCase()) ? typeValue.toLowerCase() : null
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const categoryValue = asString(pick(source, ['category']), 40)
  const category = categoryValue && categories.includes(categoryValue) ? categoryValue : null
  const paymentValue = asString(pick(source, ['payment_method', 'method', 'mode']), 40)
  const paymentMethod = paymentValue && PAYMENT_METHODS.includes(paymentValue) ? paymentValue : null
  const merchant = asString(pick(source, ['merchant', 'payee', 'paid_to', 'receiver', 'name']), 120)
  const title = asString(pick(source, ['title', 'label']), 120) || merchant
  const amount = asAmount(pick(source, ['amount', 'transaction_amount', 'paid_amount', 'transfer_amount']))
  const confidence = asConfidence(source.confidence)
  const unclear = amount == null || merchant == null || confidence < 0.55

  return {
    merchant,
    amount,
    type,
    date: asDate(pick(source, ['date', 'transaction_date', 'paid_on'])),
    time: asTime(pick(source, ['time', 'transaction_time', 'paid_at'])),
    payment_method: paymentMethod,
    reference_id: asString(pick(source, ['reference_id', 'utr', 'upi_ref', 'transaction_id', 'ref_id']), 80),
    category,
    title,
    confidence,
    notes: asString(source.notes, 280),
    unclear,
  }
}

const parseModelJson = (content) => {
  let text = String(content || '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)
  return JSON.parse(text || '{}')
}

const SYSTEM_PROMPT = [
  'You extract ONE completed payment from an Indian payment screenshot (GPay, PhonePe, Paytm, BHIM, bank, card, UPI).',
  'Return a JSON object with keys: merchant, amount, type, category, date, time, payment_method, reference_id, title, confidence, notes.',
  'Rules:',
  '- amount is the money sent or received in this transaction, never wallet/account/available balance.',
  '- merchant is the other party (payee for expense, payer/sender for income). Never the users own name if both appear.',
  '- date is the transaction date as YYYY-MM-DD, not a screenshot timestamp, app update date, or due date.',
  '- time is the transaction time as HH:MM 24-hour when visible.',
  '- reference_id is UPI Ref / UTR / UPI transaction ID only. Never a mobile number, UPI ID, or account number.',
  '- type is expense for paid/sent/debited, income for received/credited.',
  '- category must be one of Food, Transport, Shopping, Entertainment, Bills, Health, Education, Salary, Freelance, Business, Investment, Other, or null.',
  '- payment_method must be one of UPI, Card, Net banking, Wallet, Cash, Other, or null.',
  '- Use null when a field is not clearly visible. Never invent values.',
  '- confidence is 0 to 1 for the payment amount and merchant together.',
].join('\n')

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

    const userResponse = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    })
    if (!userResponse.ok) {
      return json({ error: 'Your session expired. Sign in again to use RoastScan.' }, 401)
    }

    const body = await req.json()
    const mimeType = String(body && body.mimeType ? body.mimeType : 'image/jpeg').toLowerCase()
    const imageBase64 = String(body && body.imageBase64 ? body.imageBase64 : '').replace(/\s/g, '')

    if (!mimeType.startsWith('image/')) return json({ error: 'Only image screenshots can be scanned.' }, 400)
    if (!imageBase64 || imageBase64.length < 32) return json({ error: 'The screenshot was empty.' }, 400)
    if (imageBase64.length > 1800000) {
      return json({ error: 'The screenshot is too large to scan. Crop to the payment receipt and try again.' }, 413)
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + openaiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the completed payment from this screenshot.' },
              { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + imageBase64, detail: 'high' } },
            ],
          },
        ],
      }),
    })

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text()
      console.error('[roastscan-extract] OpenAI error', openaiResponse.status, detail.slice(0, 500))
      return json({ error: 'The vision extractor is temporarily unavailable. Enter the transaction manually.' }, 502)
    }

    const openaiJson = await openaiResponse.json()
    let parsed = {}
    try {
      parsed = parseModelJson(openaiJson && openaiJson.choices && openaiJson.choices[0] && openaiJson.choices[0].message ? openaiJson.choices[0].message.content : '')
    } catch (_err) {
      return json({ error: 'The extractor returned an unreadable result. Enter the transaction manually.' }, 502)
    }

    return json({ extraction: sanitizeExtraction(parsed) })
  } catch (error) {
    console.error('[roastscan-extract]', error)
    return json({ error: 'RoastScan could not read that screenshot. Enter the transaction manually.' }, 500)
  }
})
