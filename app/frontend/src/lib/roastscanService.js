import { supabase, supabaseAnonKey, supabaseUrl } from './supabaseClient'

const invokeErrorMessage = async (error, data) => {
  if (data?.error) return data.error
  if (data?.message) return data.message
  if (typeof error?.message === 'string' && error.message && !/failed to send a request/i.test(error.message)) {
    return error.message
  }
  return error?.message || 'RoastScan could not reach the extractor.'
}

const dataUrlToBase64 = (dataUrl) => {
  const [, base64] = String(dataUrl || '').split(',')
  if (!base64) throw new Error('Could not encode the screenshot.')
  return base64
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not encode the screenshot.'))
    reader.readAsDataURL(blob)
  })

const blobToJpegBase64 = async (blob) => {
  const bitmap = await createImageBitmap(blob)
  const maxEdge = 1280
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the screenshot for scanning.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return dataUrlToBase64(canvas.toDataURL('image/jpeg', 0.82))
}

const blobToUploadBase64 = async (blob) => {
  const smallJpeg = blob.size <= 900_000 && /jpe?g/i.test(blob.type || '')
  if (smallJpeg) {
    return dataUrlToBase64(await blobToDataUrl(blob))
  }
  return blobToJpegBase64(blob)
}

export async function imageSourceToUpload({ imageBase64, mimeType, webPath }) {
  if (imageBase64) {
    return { imageBase64, mimeType: mimeType || 'image/jpeg' }
  }
  if (!webPath) {
    throw new Error('The shared screenshot could not be read.')
  }
  const response = await fetch(webPath)
  if (!response.ok) {
    throw new Error('The shared screenshot could not be opened for scanning.')
  }
  const blob = await response.blob()
  return {
    imageBase64: await blobToUploadBase64(blob),
    mimeType: 'image/jpeg',
  }
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

  return payload.extraction
}
