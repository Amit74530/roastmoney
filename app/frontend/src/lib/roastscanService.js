import { supabase } from './supabaseClient'

export async function extractRoastScanImage({ imageBase64, mimeType }) {
  if (!supabase) {
    throw new Error('Supabase is not available. Check the configuration and try again.')
  }

  const { data, error } = await supabase.functions.invoke('roastscan-extract', {
    body: {
      imageBase64,
      mimeType,
    },
  })

  if (error) {
    const serverMessage = data?.error || error.message
    throw new Error(serverMessage || 'RoastScan could not reach the extractor.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.extraction) {
    throw new Error('The extractor returned no structured result.')
  }

  return data.extraction
}
