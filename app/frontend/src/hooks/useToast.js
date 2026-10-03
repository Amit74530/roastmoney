import { useCallback, useEffect, useMemo, useState } from 'react'

const DEFAULT_DURATION = 3200
const listeners = new Set()
let toastState = null
let timeoutId = null

const publish = (nextToast) => {
  toastState = nextToast
  listeners.forEach((listener) => listener(toastState))
}

const clearTimer = () => {
  if (timeoutId) {
    window.clearTimeout(timeoutId)
    timeoutId = null
  }
}

export default function useToast() {
  const [currentToast, setCurrentToast] = useState(toastState)

  const dismiss = useCallback(() => {
    clearTimer()
    publish(null)
  }, [])

  const show = useCallback((type, message, duration = DEFAULT_DURATION) => {
    clearTimer()

    publish({ type, message: String(message || '') })

    if (duration > 0) {
      timeoutId = window.setTimeout(() => {
        timeoutId = null
        publish(null)
      }, duration)
    }
  }, [])

  useEffect(() => {
    listeners.add(setCurrentToast)
    return () => listeners.delete(setCurrentToast)
  }, [])

  const toast = useMemo(() => ({
    success: (message, duration) => show('success', message, duration),
    error: (message, duration) => show('error', message, duration),
    info: (message, duration) => show('info', message, duration),
  }), [show])

  return { toast, toastState: currentToast, dismiss }
}
