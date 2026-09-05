export default function BrandMark({ compact = false, className = '' }) {
  return (
    <span className={`brand-mark ${compact ? 'compact' : ''} ${className}`.trim()}>
      <img src="/brand/mark.png" alt="" width="28" height="28" decoding="async" />
      {!compact && (
        <span className="brand-word">
          ROAST<span>.</span>MONEY
        </span>
      )}
    </span>
  )
}
