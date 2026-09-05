const MARK_SRC = '/brand/mark.png'

export default function BrandLogo({ compact = false, size = 'md', alt = 'ROAST.MONEY' }) {
  return (
    <span className={`brand-logo brand-logo-${size}${compact ? ' compact' : ''}`}>
      <img src={MARK_SRC} alt={compact ? alt : ''} width="64" height="64" decoding="async" />
      {!compact && (
        <span className="brand-logo-wordmark">
          ROAST<span>.</span>MONEY
        </span>
      )}
    </span>
  )
}
