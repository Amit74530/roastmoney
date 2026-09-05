import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ImageUp, ScanSearch } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { ShareReceiver, isNativeShareReceiverAvailable, toDisplayableShare } from '../plugins/shareReceiver'

const emptyState = {
  status: 'loading',
  share: null,
}

export default function RoastScan() {
  const location = useLocation()
  const [state, setState] = useState(emptyState)

  useEffect(() => {
    let active = true
    setState(emptyState)

    const loadPending = async () => {
      if (!isNativeShareReceiverAvailable()) {
        if (active) {
          setState({
            status: 'unavailable',
            share: {
              received: false,
              error: 'unavailable',
              message: 'Share-to-RoastScan is available in the Android app.',
            },
          })
        }
        return
      }

      try {
        const pending = toDisplayableShare(await ShareReceiver.getPendingShare())
        if (!active) return
        if (pending?.received || pending?.error) {
          setState({ status: pending.received ? 'ready' : 'error', share: pending })
          return
        }
        setState({
          status: 'empty',
          share: {
            received: false,
            error: 'missing_stream',
            message: 'No shared image is waiting. Share a payment screenshot to ROAST.MONEY to start RoastScan.',
          },
        })
      } catch (error) {
        console.error('[RoastScan] Failed to read pending share:', error)
        if (active) {
          setState({
            status: 'error',
            share: {
              received: false,
              error: 'unreadable',
              message: 'The shared image could not be opened.',
            },
          })
        }
      }
    }

    loadPending()
    return () => { active = false }
  }, [location.search])

  const share = state.share
  const received = Boolean(share?.received && share?.webPath)
  const native = Capacitor.isNativePlatform()

  return (
    <>
      <div className="page-intro compact-intro">
        <div>
          <p className="eyebrow">RoastScan / phase 1</p>
          <h1>Shared screenshot received.</h1>
          <p className="lead">OCR and extraction are not running yet. This screen only confirms the Android share made it into ROAST.MONEY.</p>
        </div>
      </div>
      <section className="card roastscan-card">
        <div className="roastscan-status">
          <span className="eyebrow">{received ? 'Inbound image' : 'Share status'}</span>
          <h2>{received ? 'Image captured locally.' : share?.message || 'Waiting for a shared image.'}</h2>
          <p>
            {received
              ? 'The file stays on-device. Nothing has been uploaded, scanned, or written to your transactions.'
              : native
                ? 'Share an image from another app and choose ROAST.MONEY.'
                : 'Open this flow from the installed Android app to receive a shared screenshot.'}
          </p>
        </div>
        <div className={`roastscan-badge ${received ? 'ok' : 'warn'}`}>
          <ScanSearch size={18} />
          {received ? 'Ready for Phase 2' : 'No extractable image'}
        </div>
      </section>
      {received ? (
        <figure className="card roastscan-preview-card">
          <img className="roastscan-preview" src={share.webPath} alt={share.fileName || 'Shared payment screenshot'} />
          <figcaption>
            <ImageUp size={14} />
            <span>{share.fileName}</span>
            {share.mimeType ? <span className="roastscan-mime">{share.mimeType}</span> : null}
          </figcaption>
        </figure>
      ) : state.status !== 'loading' ? (
        <section className="card roastscan-empty">
          <p className="error">{share?.message || 'Unsupported or unreadable shared content.'}</p>
        </section>
      ) : null}
      <div className="roastscan-actions">
        <Link className="button outline" to="/dashboard"><ArrowLeft size={16} /> Back to home</Link>
      </div>
    </>
  )
}
