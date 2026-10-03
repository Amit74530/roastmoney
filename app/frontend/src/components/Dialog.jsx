import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** Native modal semantics provide focus trapping, Escape, and background inertness. */
export default function Dialog({ children, onClose, label, busy = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      className="app-dialog"
      aria-label={label}
      aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}
    >
      <div className="modal">{children}</div>
    </dialog>,
    document.body,
  )
}
