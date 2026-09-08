const normalizeText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const sameAmount = (left, right) => Math.abs(Number(left || 0) - Number(right || 0)) < 0.009

export function findLikelyDuplicates(transactions = [], candidate = {}) {
  const amount = Number(candidate.amount)
  const date = String(candidate.transaction_date || '').slice(0, 10)
  const title = normalizeText(candidate.title || candidate.merchant)
  const reference = normalizeText(candidate.reference_id)

  if (!Number.isFinite(amount) || amount <= 0 || !date) return []

  return transactions.filter((item) => {
    const itemRef = normalizeText(item.reference_id)
    if (reference && itemRef && reference === itemRef) return true

    const itemTitle = normalizeText(item.title || item.merchant)
    const itemDate = String(item.transaction_date || '').slice(0, 10)
    const sameMerchant = Boolean(title) && title === itemTitle
    return sameAmount(item.amount, amount) && itemDate === date && sameMerchant
  })
}
