import { supabase } from './supabaseClient'

const invokeErrorMessage = async (error, data) => {
  if (data?.error) return data.error
  if (data?.message) return data.message
  try {
    const body = typeof error?.context?.json === 'function' ? await error.context.json() : null
    if (body?.error) return body.error
  } catch {
    // Fall through to the generic message.
  }
  return error?.message || 'RoastScan could not reach the extractor.'
}

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
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  const [, base64] = dataUrl.split(',')
  if (!base64) throw new Error('Could not encode the screenshot.')
  return base64
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
    imageBase64: await blobToJpegBase64(blob),
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

  const { data, error } = await supabase.functions.invoke('roastscan-extract', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: {
      imageBase64,
      mimeType: mimeType || 'image/jpeg',
    },
  })

  if (error) {
    throw new Error(await invokeErrorMessage(error, data))
  }
  if (data?.error) {
    throw new Error(data.error)
  }
  if (!data?.extraction) {
    throw new Error('The extractor returned no structured result.')
  }

  return data.extraction
}
