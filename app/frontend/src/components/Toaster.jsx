const toastTypes = new Set(['success', 'error', 'info'])

export default function Toaster({ toast }) {
  if (!toast?.message) return null

  const type = toastTypes.has(toast.type) ? toast.type : 'info'

  return (
    <div
      className="toast"
      data-toast-type={type}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {toast.message}
    </div>
  )
}
