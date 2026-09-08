const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'gpt-4o'
const ALLOWED_TYPES = ['income', 'expense']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other']
const PAYMENT_METHODS = ['UPI', 'Card', 'Net banking', 'Wallet', 'Cash', 'Other']
const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] }
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] }

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'merchant', 'amount', 'type', 'category', 'date', 'time',
    'payment_method', 'reference_id', 'title', 'confidence',
  ],
  properties: {
    merchant: nullableString,
    amount: nullableNumber,
    type: { anyOf: [{ type: 'string', enum: ALLOWED_TYPES }, { type: 'null' }] },
    category: {
      anyOf: [
        { type: 'string', enum: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Salary', 'Freelance', 'Business', 'Investment', 'Other'] },
        { type: 'null' },
      ],
    },
    date: nullableString,
    time: nullableString,
    payment_method: { anyOf: [{ type: 'string', enum: PAYMENT_METHODS }, { type: 'null' }] },
    reference_id: nullableString,
    title: nullableString,
    confidence: { type: 'number' },
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
    if (raw && raw[key] != null && raw[key] !== '') return raw[key]
  }
  return null
}

const asAmount = (value) => {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null
  }
  const text = asString(value, 48)
  if (!text) return null
  const cleaned = text
    .replace(/(?:₹|rs\.?|inr)/gi, '')
    .replace(/,/g, '')
    .trim()
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100) / 100
}

const pad = (value) => String(value).padStart(2, '0')

const asDate = (value) => {
  const text = asString(value, 48)
  if (!text) return null
  const isoDate = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) return isoDate[1] + '-' + isoDate[2] + '-' + isoDate[3]

  const ymd = text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/)
  if (ymd) return ymd[1] + '-' + pad(ymd[2]) + '-' + pad(ymd[3])

  const named = text.match(/(\d{1,2})\s+([A-Za-z]+),?\s+(\d{2,4})/)
  if (named) {
    const month = MONTHS[named[2].toLowerCase()]
    let year = Number(named[3])
    if (year < 100) year += 2000
    const day = Number(named[1])
    if (month && day >= 1 && day <= 31) return year + '-' + pad(month) + '-' + pad(day)
  }

  const namedFirst = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})/)
  if (namedFirst) {
    const month = MONTHS[namedFirst[1].toLowerCase()]
    let year = Number(namedFirst[3])
    if (year < 100) year += 2000
    const day = Number(namedFirst[2])
    if (month && day >= 1 && day <= 31) return year + '-' + pad(month) + '-' + pad(day)
  }

  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    let year = Number(dmy[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
      return year + '-' + pad(month) + '-' + pad(day)
    }
  }

  return null
}

const asTime = (value) => {
  const text = asString(value, 16)
  if (!text) return null
  const ampm = text.match(/(\d{1,2})[:.](\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?/i)
  if (!ampm) return null
  let hours = Number(ampm[1])
  const minutes = Number(ampm[2])
  const meridian = ampm[3] ? ampm[3].toLowerCase().replace(/\./g, '') : ''
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

const asPaymentMethod = (value) => {
  const text = asString(value, 40)
  if (!text) return null
  if (PAYMENT_METHODS.includes(text)) return text
  const lower = text.toLowerCase()
  if (/(upi|gpay|google pay|phonepe|paytm|bhim|cred|amazon pay upi)/.test(lower)) return 'UPI'
  if (/(card|visa|mastercard|rupay|credit|debit)/.test(lower)) return 'Card'
  if (/(net\s*bank|neft|imps|rtgs|internet bank)/.test(lower)) return 'Net banking'
  if (/(wallet|paytm wallet|amazon pay)/.test(lower)) return 'Wallet'
  if (/cash/.test(lower)) return 'Cash'
  return null
}

const sanitizeExtraction = (raw) => {
  const source = raw || {}
  const typeValue = asString(pick(source, ['type', 'transaction_type', 'direction']), 16)
  const type = typeValue && ALLOWED_TYPES.includes(typeValue.toLowerCase()) ? typeValue.toLowerCase() : null
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const categoryValue = asString(pick(source, ['category']), 40)
  const category = categoryValue && categories.includes(categoryValue) ? categoryValue : null
  const paymentMethod = asPaymentMethod(pick(source, ['payment_method', 'method', 'mode']))
  const merchantKeys = type === 'income'
    ? ['merchant', 'payer', 'sender', 'from', 'paid_from']
    : ['merchant', 'payee', 'paid_to', 'receiver', 'to', 'paid_to_name']
  const merchant = asString(pick(source, merchantKeys), 120)
  const title = asString(pick(source, ['title', 'label']), 120) || merchant
  const amount = asAmount(pick(source, ['amount', 'transaction_amount', 'paid_amount', 'transfer_amount']))
  let confidence = asConfidence(source.confidence)
  if (amount == null || merchant == null) confidence = Math.min(confidence, 0.4)

  return {
    merchant,
    amount,
    type,
    category,
    date: asDate(pick(source, ['date', 'transaction_date', 'paid_on'])),
    time: asTime(pick(source, ['time', 'transaction_time', 'paid_at'])),
    payment_method: paymentMethod,
    reference_id: asString(pick(source, ['reference_id', 'utr', 'upi_ref', 'transaction_id', 'ref_id']), 80),
    title,
    confidence,
  }
}

const parseModelJson = (content) => {
  let text = String(content || '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)
  return JSON.parse(text || '{}')
}

const unwrapBase64 = (raw) => {
  let text = String(raw || '').replace(/\s/g, '')
  const comma = text.indexOf(',')
  if (text.toLowerCase().startsWith('data:') && comma >= 0) {
    text = text.slice(comma + 1)
  }
  text = text.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (text.length % 4)) % 4
  if (padLen) text += '='.repeat(padLen)
  return text
}

const decodeBase64 = (b64) => {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const readU16 = (bytes, offset) => (bytes[offset] << 8) | bytes[offset + 1]
const readU32 = (bytes, offset) =>
  ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0

const jpegSize = (bytes) => {
  let i = 2
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1
      continue
    }
    const marker = bytes[i + 1]
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00 || marker === 0xff) {
      i += 2
      continue
    }
    if (i + 3 >= bytes.length) break
    const length = readU16(bytes, i + 2)
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (sof && i + 8 < bytes.length) {
      return { width: readU16(bytes, i + 7), height: readU16(bytes, i + 5) }
    }
    i += 2 + length
  }
  return { width: null, height: null }
}

const inspectImage = (bytes) => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { format: 'jpeg', mime: 'image/jpeg', ...jpegSize(bytes) }
  }
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { format: 'png', mime: 'image/png', width: readU32(bytes, 16), height: readU32(bytes, 20) }
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { format: 'webp', mime: 'image/webp', width: null, height: null }
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { format: 'gif', mime: 'image/gif', width: null, height: null }
  }
  if (bytes.length > 20 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return { format: 'heif', mime: 'image/heic', width: null, height: null }
  }
  return { format: 'unknown', mime: null, width: null, height: null }
}

const redactLog = (value) =>
  String(value || '')
    .replace(/sk-[a-zA-Z0-9._-]+/g, '[redacted]')
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, '[image]')

const SYSTEM_PROMPT = [
  'You extract ONE completed Indian payment from a screenshot (GPay, PhonePe, Paytm, BHIM, CRED, bank SMS/app, card, UPI).',
  'Return only the schema fields. Use null when a value is not clearly visible. Never invent values.',
  'Field rules:',
  '- amount: the completed debit/credit for THIS payment only. Ignore available balance, wallet balance, account balance, previous balance, remaining limit, cashback, and rewards.',
  '- Prefer the largest rupee amount labelled Paid, Sent, Debited, Received, Credited, Transferred, or shown under Payment successful. If both a small payment amount and a larger balance appear, choose the payment amount.',
  '- merchant: the counterparty. For expense/paid/sent use Paid to / To / payee / merchant. For income/received use From / payer / sender. Never the app name (Google Pay, PhonePe, Paytm). Never a bank name unless it is the actual payee. Never the user own account holder name if both parties are visible.',
  '- type: expense if paid/sent/debited/transferred out; income if received/credited.',
  '- date: transaction date as YYYY-MM-DD, not screenshot capture time, due date, or statement period.',
  '- time: transaction time as HH:MM 24-hour when shown next to the payment, else null.',
  '- reference_id: UPI Ref No, UTR, UPI transaction ID, or bank reference only. Never a mobile number, UPI ID (contains @), account number, IFSC, or masked card number.',
  '- payment_method: UPI, Card, Net banking, Wallet, Cash, Other, or null.',
  '- category: Food, Transport, Shopping, Entertainment, Bills, Health, Education, Salary, Freelance, Business, Investment, Other, or null. Do not guess from thin evidence.',
  '- title: short ledger label, usually the merchant.',
  '- confidence: 0 to 1 for merchant+amount together. Below 0.55 if either is uncertain.',
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
    const claimedMime = String(body && body.mimeType ? body.mimeType : 'image/jpeg').toLowerCase()
    const imageBase64 = unwrapBase64(body && body.imageBase64 ? body.imageBase64 : '')

    if (!claimedMime.startsWith('image/') && claimedMime !== 'application/octet-stream') {
      return json({ error: 'Only image screenshots can be scanned.' }, 400)
    }
    if (!imageBase64 || imageBase64.length < 32) return json({ error: 'The screenshot was empty.' }, 400)
    if (imageBase64.length > 1800000) {
      return json({ error: 'The screenshot is too large to scan. Crop to the payment receipt and try again.' }, 413)
    }

    let bytes
    try {
      bytes = decodeBase64(imageBase64)
    } catch (_err) {
      console.error('[roastscan-extract] invalid base64', { claimedMime, base64Length: imageBase64.length })
      return json({ error: 'The screenshot could not be decoded.' }, 400)
    }

    const info = inspectImage(bytes)
    const mimeType = info.mime || (claimedMime === 'image/jpg' ? 'image/jpeg' : claimedMime)

    console.log('[roastscan-extract] image accepted', {
      claimedMime,
      detectedFormat: info.format,
      mimeType,
      byteLength: bytes.length,
      base64Length: imageBase64.length,
      width: info.width,
      height: info.height,
      magic: Array.from(bytes.slice(0, 4)).map((n) => n.toString(16).padStart(2, '0')).join(''),
    })

    if (info.format === 'unknown') {
      return json({ error: 'The screenshot was not a readable image. Share the original payment screenshot.' }, 400)
    }
    if (info.format === 'heif') {
      return json({ error: 'HEIC screenshots are not readable. Share a PNG or JPEG of the payment.' }, 400)
    }

    const dataUrl = 'data:' + mimeType + ';base64,' + imageBase64
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract the completed payment. Distinguish transaction amount from account/wallet balance. Distinguish payee from sender. Return null for anything not visible.',
          },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ]

    const callOpenAI = (responseFormat) =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + openaiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          max_tokens: 700,
          response_format: responseFormat,
          messages,
        }),
      })

    const schemaFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'roastscan_extraction',
        strict: true,
        schema: EXTRACTION_SCHEMA,
      },
    }

    console.log('[roastscan-extract] openai request', {
      model: MODEL,
      api: 'chat.completions',
      responseFormat: 'json_schema',
      imageDetail: 'high',
      dataUrlPrefix: dataUrl.slice(0, dataUrl.indexOf(',') + 1),
      promptChars: SYSTEM_PROMPT.length,
    })

    let openaiResponse = await callOpenAI(schemaFormat)
    if (!openaiResponse.ok && openaiResponse.status === 400) {
      const firstError = redactLog(await openaiResponse.text())
      console.error('[roastscan-extract] json_schema rejected, retrying json_object', openaiResponse.status, firstError.slice(0, 300))
      openaiResponse = await callOpenAI({ type: 'json_object' })
    }

    if (!openaiResponse.ok) {
      const detail = redactLog(await openaiResponse.text())
      console.error('[roastscan-extract] OpenAI error', openaiResponse.status, detail.slice(0, 400))
      return json({ error: 'The vision extractor is temporarily unavailable. Enter the transaction manually.' }, 502)
    }

    const openaiJson = await openaiResponse.json()
    const choice = openaiJson && openaiJson.choices && openaiJson.choices[0]
    const content = choice && choice.message ? choice.message.content : ''
    console.log('[roastscan-extract] openai response', {
      model: openaiJson && openaiJson.model,
      finishReason: choice && choice.finish_reason,
      usage: openaiJson && openaiJson.usage,
      contentChars: String(content || '').length,
    })

    let parsed = {}
    try {
      parsed = parseModelJson(content)
    } catch (_err) {
      console.error('[roastscan-extract] unreadable model json', { finishReason: choice && choice.finish_reason })
      return json({ error: 'The extractor returned an unreadable result. Enter the transaction manually.' }, 502)
    }

    const extraction = sanitizeExtraction(parsed)
    console.log('[roastscan-extract] fields present', {
      merchant: extraction.merchant != null,
      amount: extraction.amount != null,
      type: extraction.type != null,
      category: extraction.category != null,
      date: extraction.date != null,
      time: extraction.time != null,
      payment_method: extraction.payment_method != null,
      reference_id: extraction.reference_id != null,
      title: extraction.title != null,
      confidence: extraction.confidence,
    })

    return json({ extraction })
  } catch (error) {
    console.error('[roastscan-extract]', error && error.name ? error.name : 'error')
    return json({ error: 'RoastScan could not read that screenshot. Enter the transaction manually.' }, 500)
  }
})
