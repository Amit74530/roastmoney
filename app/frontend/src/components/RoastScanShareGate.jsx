import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ShareReceiver, isNativeShareReceiverAvailable, toDisplayableShare } from '../plugins/shareReceiver'

function shouldOpenRoastScan(payload) {
  return Boolean(payload && (payload.received || payload.error))
}

export default function RoastScanShareGate({ isAuthenticated }) {
  const navigate = useNavigate()
  const location = useLocation()
  const lastIdRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !isNativeShareReceiverAvailable()) return undefined

    let removed = false
    let listenerHandle

    const openRoastScan = (rawPayload) => {
      const payload = toDisplayableShare(rawPayload)
      if (!shouldOpenRoastScan(payload)) return
      if (payload.id && payload.id === lastIdRef.current) return
      if (payload.id) lastIdRef.current = payload.id
      const target = payload.id ? `/roastscan?share=${encodeURIComponent(payload.id)}` : '/roastscan'
      if (`${location.pathname}${location.search}` !== target) {
        navigate(target, { replace: location.pathname === '/roastscan' })
      }
    }

    const setup = async () => {
      try {
        const pending = await ShareReceiver.getPendingShare()
        if (!removed) openRoastScan(pending)
        listenerHandle = await ShareReceiver.addListener('shareReceived', (event) => {
          if (!removed) openRoastScan(event)
        })
      } catch (error) {
        console.error('[RoastScan] Share receiver unavailable:', error)
      }
    }

    setup()

    return () => {
      removed = true
      if (listenerHandle) listenerHandle.remove()
    }
  }, [isAuthenticated, location.pathname, location.search, navigate])

  return null
}
