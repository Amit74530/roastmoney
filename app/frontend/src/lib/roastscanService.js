import { supabase, supabaseAnonKey, supabaseUrl } from './supabaseClient'

const invokeErrorMessage = async (error, data) => {
  if (data?.error) return data.error
  if (data?.message) return data.message
  if (typeof error?.message === 'string' && error.message && !/failed to send a request/i.test(error.message)) {
    return error.message
  }
  return error?.message || 'RoastScan could not reach the extractor.'
}

const sniffMime = (bytes) => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp'
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  return ''
}

const bytesToBase64 = (bytes) => {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const unwrapBase64 = (raw) => {
  let text = String(raw || '').replace(/\s/g, '')
  const comma = text.indexOf(',')
  if (text.toLowerCase().startsWith('data:') && comma >= 0) {
    text = text.slice(comma + 1)
  }
  return text
}

const blobToJpegBase64 = async (blob) => {
  const bitmap = await createImageBitmap(blob)
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the screenshot for scanning.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
  bitmap.close?.()
  return unwrapBase64(dataUrl)
}

const blobToUpload = async (blob) => {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const sniffed = sniffMime(bytes)
  const smallEnough = bytes.length <= 1_200_000
  if (sniffed && smallEnough && sniffed !== 'image/gif') {
    return { imageBase64: bytesToBase64(bytes), mimeType: sniffed, byteLength: bytes.length }
  }
  return {
    imageBase64: await blobToJpegBase64(blob),
    mimeType: 'image/jpeg',
    byteLength: bytes.length,
  }
}

export async function imageSourceToUpload({ imageBase64, mimeType, webPath }) {
  if (imageBase64) {
    const cleaned = unwrapBase64(imageBase64)
    return {
      imageBase64: cleaned,
      mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : (mimeType || 'image/jpeg'),
      byteLength: Math.floor(cleaned.length * 0.75),
    }
  }
  if (!webPath) {
    throw new Error('The shared screenshot could not be read.')
  }
  const response = await fetch(webPath)
  if (!response.ok) {
    throw new Error('The shared screenshot could not be opened for scanning.')
  }
  const blob = await response.blob()
  return blobToUpload(blob)
}

export async function extractRoastScanImage({ imageBase64, mimeType }) {
  if (!supabase) {
    throw new Error('Supabase is not available. Check the configuration and try again.')
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) {
    throw new Error('Sign in to scan a payment screenshot.')
  }
  if (!imageBase64) {
    throw new Error('The screenshot was empty.')
  }

  console.info('[RoastScan] sending image', {
    mimeType: mimeType || 'image/jpeg',
    base64Length: imageBase64.length,
  })

  let response
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/roastscan-extract`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: mimeType || 'image/jpeg',
      }),
    })
  } catch (error) {
    throw new Error(error?.message || 'Could not reach the RoastScan extractor.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(await invokeErrorMessage({ message: `Extractor failed (${response.status}).` }, payload))
  }
  if (payload?.error) {
    throw new Error(payload.error)
  }
  if (!payload?.extraction) {
    throw new Error('The extractor returned no structured result.')
  }

  const extraction = payload.extraction
  console.info('[RoastScan] extraction fields', {
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

  return extraction
}
