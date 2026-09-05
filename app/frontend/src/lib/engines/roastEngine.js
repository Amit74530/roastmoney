function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length]
}

function hourOf(timestamp) {
  return new Date(timestamp).getHours()
}

const AMOUNT_TIERS = {
  micro: (a) => a <= 150,
  low: (a) => a > 150 && a <= 600,
  medium: (a) => a > 600 && a <= 2000,
  high: (a) => a > 2000 && a <= 8000,
  extreme: (a) => a > 8000,
}

function amountTier(amount) {
  return Object.keys(AMOUNT_TIERS).find((tier) => AMOUNT_TIERS[tier](amount)) || 'medium'
}

const TEMPLATES = {
  micro: [
    (t) => `Only ₹${t.amount}? Cute. You're basically financially responsible.`,
    (t) => `₹${t.amount} at ${t.merchant}. A rounding error, really.`,
    (t) => `This is the financial equivalent of a shrug.`,
  ],
  low: [
    (t) => `₹${t.amount} disappeared faster than your motivation to cook.`,
    (t) => `${t.merchant}, ₹${t.amount}. Small, forgettable, repeated weekly.`,
    (t) => `A modest little transaction. We've seen worse from you today alone.`,
  ],
  medium: [
    (t) => `₹${t.amount} at ${t.merchant}. Not a crisis, just a pattern forming.`,
    (t) => `You felt something today, and it cost ₹${t.amount}.`,
    (t) => `This is the kind of purchase that seems fine in isolation.`,
  ],
  high: [
    (t) => `₹${t.amount}. That's not a purchase. That's a financial event.`,
    (t) => `₹${t.amount} at ${t.merchant} — bold. Deeply, unnecessarily bold.`,
    (t) => `Your future self just felt a disturbance and didn't know why.`,
  ],
  extreme: [
    (t) => `₹${t.amount}?! Sir/Ma'am, this is no longer a purchase.`,
    (t) => `We need to talk about ₹${t.amount} the way a bank would: seriously.`,
    (t) => `This transaction has its own gravitational pull.`,
  ],
  lateNight: [
    (t) => `Buying things at ${formatHour(t.hour)} is certainly one way to make tomorrow interesting.`,
    (t) => `${formatHour(t.hour)}. Nothing good has ever been purchased at this hour, historically.`,
    (t) => `Your judgment clocks out well before ${formatHour(t.hour)} does.`,
  ],
  food: [
    () => `At this point, your kitchen is decorative.`,
    (t) => `${t.merchant} again. They should just mail you a spare key.`,
    () => `Cooking remains, as ever, a theoretical skill.`,
    () => `Your fridge has filed a formal complaint.`,
    () => `"Your kitchen would like to know why you keep doing this."`,
  ],
  shopping: [
    () => `Your cart has officially become a long-term relationship.`,
    (t) => `${t.merchant}. Another item you'll wear twice and regret honestly.`,
    () => `Retail therapy: no license required, apparently.`,
    () => `This is less a purchase and more a lifestyle commitment.`,
  ],
  subscriptions: [
    () => `Another subscription. Because apparently monthly regret wasn't enough.`,
    (t) => `${t.merchant}, billed forever, used occasionally.`,
    () => `You now pay rent to at least four apps.`,
  ],
  travel: [
    (t) => `${t.merchant}. Movement, at a price.`,
    () => `Going somewhere, or just avoiding being at home?`,
    () => `This is fine. Everything about getting from A to B is fine.`,
  ],
  entertainment: [
    (t) => `${t.merchant}. An investment in feeling something for two hours.`,
    (t) => `Fun has a price tag now, apparently ₹${t.amount} of one.`,
    () => `A little joy, correctly priced.`,
  ],
  bills: [
    () => `A bill. The rare purchase that isn't your fault.`,
    (t) => `${t.merchant} — the tax on simply existing indoors.`,
  ],
  other: [
    (t) => `${t.merchant}. We genuinely don't know what to say about this one.`,
    () => `Uncategorised spending. The financial equivalent of a shrug emoji.`,
  ],
  repeatedMerchant: [
    (t) => `${t.merchant} again? At this rate you're basically a shareholder.`,
    (t) => `You and ${t.merchant} have a whole thing going on now.`,
  ],
  repeatedSmall: [
    () => `Ten small purchases don't hide from one large spreadsheet.`,
    () => `Death by a thousand ₹99s. A classic.`,
  ],
}

function formatHour(h) {
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:00 ${period}`
}

function categoryKey(category) {
  return String(category || 'other').toLowerCase()
}

function intensityFor(transaction, tier, hour, hourKnown) {
  let score = { micro: 8, low: 22, medium: 45, high: 68, extreme: 92 }[tier] ?? 40
  if (hourKnown && hour >= 0 && hour < 5) score += 12
  if (transaction.category === 'Subscriptions') score += 5
  return Math.max(1, Math.min(100, score))
}

export function generate(transaction, context = {}, variantOffset = 0) {
  const { history = [] } = context
  const hourKnown = transaction.hourKnown !== false
  const seedBase = hashString(transaction.merchant + transaction.amount + transaction.timestamp)
  const hour = hourOf(transaction.timestamp)
  const tier = amountTier(transaction.amount)
  const catKey = categoryKey(transaction.category)

  const candidates = []

  if (hourKnown && hour >= 0 && hour < 5) {
    candidates.push({ pool: TEMPLATES.lateNight, weight: 3, ctx: { ...transaction, hour } })
  }

  const sameMerchantCount = history.filter((item) => item.merchant === transaction.merchant).length
  if (sameMerchantCount >= 2) {
    candidates.push({ pool: TEMPLATES.repeatedMerchant, weight: 2, ctx: transaction })
  }

  const smallCount = history.filter((item) => item.amount <= 150).length
  if (smallCount >= 5 && transaction.amount <= 150) {
    candidates.push({ pool: TEMPLATES.repeatedSmall, weight: 2, ctx: transaction })
  }

  if (TEMPLATES[catKey]) {
    candidates.push({ pool: TEMPLATES[catKey], weight: 2, ctx: transaction })
  }

  candidates.push({ pool: TEMPLATES[tier], weight: 1, ctx: transaction })

  const expanded = []
  candidates.forEach((candidate) => {
    for (let i = 0; i < candidate.weight; i += 1) expanded.push(candidate)
  })

  const chosen = pick(expanded, seedBase, variantOffset)
  const template = pick(chosen.pool, seedBase, variantOffset + 1)
  const text = template(chosen.ctx)
  const intensity = intensityFor(transaction, tier, hour, hourKnown)

  return {
    text,
    intensity,
    tier,
    tags: [catKey, tier, hourKnown && hour < 5 ? 'late-night' : null].filter(Boolean),
  }
}

export function reRoast(transaction, context = {}) {
  return generate(transaction, context, 7)
}

export function statusLabel(intensity) {
  if (intensity <= 20) return 'RESPONSIBLE'
  if (intensity <= 40) return 'SLIGHTLY SUSPICIOUS'
  if (intensity <= 60) return 'QUESTIONABLE'
  if (intensity <= 80) return 'CONCERNING'
  return 'FINANCIAL MENACE'
}

export { amountTier }
