const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_TYPES = new Set(['income', 'expense'])
const INCOME_CATEGORIES = new Set(['Salary', 'Freelance', 'Business', 'Investment', 'Other'])
const EXPENSE_CATEGORIES = new Set(['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'])
const PAYMENT_METHODS = new Set(['UPI', 'Card', 'Net banking', 'Wallet', 'Cash', 'Other'])

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const asString = (value, max = 180) => {
  if (value == null) return null
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (!text || text.toLowerCase() === 'null' || text === 'unknown') return null
  return text.slice(0, max)
}

const asAmount = (value) => {
  if (value == null || value === '') return null
  const amount = Number(String(value).replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100) / 100
}

const asDate = (value) => {
  const text = asString(value, 10)
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

const asTime = (value) => {
  const text = asString(value, 8)
  if (!text) return null
  const match = text.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const asConfidence = (value) => {
  const confidence = Number(value)
  if (!Number.isFinite(confidence)) return 0
  return Math.max(0, Math.min(1, Math.round(confidence * 100) / 100))
}

const sanitizeExtraction = (raw = {}) => {
  const type = ALLOWED_TYPES.has(raw.type) ? raw.type : 'expense'
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const category = categories.has(raw.category) ? raw.category : 'Other'
  const paymentMethod = PAYMENT_METHODS.has(raw.payment_method) ? raw.payment_method : asString(raw.payment_method, 40)
  const merchant = asString(raw.merchant, 120)
  const title = asString(raw.title, 120) || merchant
  const amount = asAmount(raw.amount)
  const confidence = asConfidence(raw.confidence)
  const unclear = Boolean(raw.unclear) || amount == null || confidence < 0.55

  return {
    merchant,
    amount,
    type,
    date: asDate(raw.date),
    time: asTime(raw.time),
    payment_method: PAYMENT_METHODS.has(paymentMethod) ? paymentMethod : paymentMethod ? 'Other' : null,
    reference_id: asString(raw.reference_id, 80),
    category,
    title,
    confidence,
    notes: asString(raw.notes, 280),
    unclear,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

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
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return json({ error: 'Your session expired. Sign in again to use RoastScan.' }, 401)
    }

    const body = await req.json()
    const mimeType = String(body?.mimeType || 'image/jpeg').toLowerCase()
    const imageBase64 = String(body?.imageBase64 || '').replace(/\s/g, '')

    if (!mimeType.startsWith('image/')) {
      return json({ error: 'Only image screenshots can be scanned.' }, 400)
    }
    if (!imageBase64 || imageBase64.length < 32) {
      return json({ error: 'The screenshot was empty.' }, 400)
    }
    if (imageBase64.length > 1_800_000) {
      return json({ error: 'The screenshot is too large to scan. Try a cropped payment receipt.' }, 413)
    }

    const prompt = `Extract a single payment from this Indian payment screenshot (UPI, GPay, PhonePe, Paytm, bank SMS, card, or cash receipt).
Return JSON only with keys:
merchant, amount, type, date, time, payment_method, reference_id, category, title, confidence, notes, unclear.
Rules:
- amount is a positive number without currency symbols.
- type is income or expense. Credits/received money are income. Debits/paid/sent money are expense.
- date is YYYY-MM-DD if visible, else null.
- time is HH:MM 24-hour if visible, else null.
- payment_method is one of: UPI, Card, Net banking, Wallet, Cash, Other.
- category is one of: Food, Transport, Shopping, Entertainment, Bills, Health, Education, Other for expenses; Salary, Freelance, Business, Investment, Other for income.
- title is a short ledger label.
- confidence is 0 to 1.
- unclear is true if merchant or amount cannot be read confidently.
- Do not invent a reference_id. Use null when missing.
- notes can mention what was readable.`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You extract structured payment data. Never return markdown.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    })

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text()
      console.error('[roastscan-extract] OpenAI error', openaiResponse.status, detail.slice(0, 400))
      return json({ error: 'The vision extractor is temporarily unavailable. Enter the transaction manually.' }, 502)
    }

    const openaiJson = await openaiResponse.json()
    const content = openaiJson?.choices?.[0]?.message?.content
    let parsed = {}
    try {
      parsed = JSON.parse(content || '{}')
    } catch {
      return json({ error: 'The extractor returned an unreadable result. Enter the transaction manually.' }, 502)
    }

    const extraction = sanitizeExtraction(parsed)
    return json({ extraction })
  } catch (error) {
    console.error('[roastscan-extract]', error)
    return json({ error: 'RoastScan could not read that screenshot. Enter the transaction manually.' }, 500)
  }
})
