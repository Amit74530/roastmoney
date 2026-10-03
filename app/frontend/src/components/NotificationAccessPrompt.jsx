import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { TransactionCapture } from '../plugins/transactionCapture'

export default function NotificationAccessPrompt({ onDismiss }) {
  const [opening, setOpening] = useState(false)

  const enable = async () => {
    try {
      setOpening(true)
      await TransactionCapture.openSettings()
    } catch (error) {
      console.error('[NotificationAccess] Failed to open settings:', error)
    } finally {
      setOpening(false)
      onDismiss()
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onDismiss}>
      <div className="modal notification-prompt" onMouseDown={(e) => e.stopPropagation()}>
        <button className="icon-button prompt-close" onClick={onDismiss} aria-label="Close">
          <X size={18} />
        </button>

        <div className="prompt-icon">
          <Bell size={22} />
        </div>

        <span className="eyebrow">One quick setup</span>
        <h2>Turn on auto-capture.</h2>
        <p className="prompt-copy">
          RoastMoney can read payment notifications from GPay, PhonePe, and Paytm, and log them to your ledger automatically.
        </p>
        <p className="prompt-note">
          We only read payment notifications. Never personal messages, never OTPs.
        </p>

        <div className="prompt-actions">
          <button className="button outline" onClick={onDismiss}>Not now</button>
          <button className="button lime" disabled={opening} onClick={enable}>
            {opening ? 'Opening…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  )
}