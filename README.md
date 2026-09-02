# ROAST.MONEY

A frontend prototype for a humorous personal-finance product. Vanilla HTML/CSS/JS,
no frameworks, no backend — everything (roasts, personality, achievements) is
computed locally from a seeded transaction dataset.

## Running it

No build step. From the project root:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`. (Opening `index.html` directly also works
in most browsers, but a local server avoids any module/CORS quirks.)

## File structure

```
roast-money/
├── index.html              All markup, section by section
├── css/
│   ├── reset.css            Minimal reset + reduced-motion baseline
│   ├── variables.css        Design tokens: color, type, spacing, motion
│   ├── style.css            Section-level layout
│   ├── components.css       Nav, buttons, receipt, forms, cards, etc.
│   └── animations.css       Scroll-reveal + reduced-motion overrides
├── js/
│   ├── demo-data.js         Seed transactions (Aug 2026) + hero ticker data
│   ├── roast-engine.js      Deterministic, rule-based commentary generator
│   ├── personality-engine.js  Weighted personality scoring + achievements
│   ├── animations.js        Count-up, scroll-reveal, magnetic pointer helpers
│   ├── ui.js                Pure rendering functions (data in, DOM out)
│   └── app.js                Central state + event wiring / orchestration
└── README.md
```

## Architecture notes

- **State** lives in a single object in `app.js` (`state`), matching the
  shape described in the brief (`transactions`, `filters`, `personality`,
  `roastScore`, `achievements`, `wrappedIndex`, ...). Nothing is scattered
  across ad-hoc globals.
- **Rendering is separated from state.** `ui.js` only takes data and writes
  DOM; it never reads or mutates `state` directly. This is the seam where a
  React port would slot in — most `UI.render*` functions map directly to a
  future component.
- **The roast and personality engines are pure functions** of a transaction
  list. Swapping the local `DEMO_TRANSACTIONS` array for a real API response
  requires no changes to either engine.
- **No AI call, no network request.** All "intelligence" is a deterministic,
  hashed template selection — the same transaction always produces the same
  roast unless the "roast it again" action is used, which asks for a
  different variant.

## Major interactions

- **Hero receipt** cycles through demo transactions every ~4s, with a wallet
  mood indicator that reacts to the current roast's intensity.
- **How it works** — the active step highlights based on scroll position via
  `IntersectionObserver`.
- **Transaction Lab** — a real form; submitting runs a short faux-analysis
  sequence, then generates a roast, adds the transaction to history, and
  recomputes personality/achievements/score.
- **Transaction history** — search, category filter, four sort orders,
  per-row delete, and a detail panel with a "roast it again" action.
- **Spending heatmap** — a 31-day CSS grid; hover for a tooltip, click to
  filter the history list to that day.
- **Money flow** — a category breakdown rendered as animated horizontal bars
  rather than a pie chart.
- **Personality reveal** — computed from real ratios (late-night purchases,
  impulse buys, category mix, weekend spend, etc.), with count-up trait
  numbers and a generated "diagnosis" line.
- **Achievements** — seven rules evaluated against the live transaction list,
  two of which stay hidden until unlocked.
- **Money Wrapped** — a six-screen keyboard- and button-navigable summary
  built from the current data (biggest category, most questionable purchase,
  worst habit, personality, verdict).
- **Share card** — drawn client-side on a `<canvas>` and downloadable as a
  PNG; no server round-trip.
- **Easter eggs**: click the logo seven times, submit ₹69, ₹0, or a purchase
  over ₹50,000 in the lab for a special response.

## Phase 2 (not built here, but the code is structured for it)

- Replace `DEMO_TRANSACTIONS` with a real transaction import (bank/UPI feed).
- Move the roast engine's template selection to an actual LLM call, using
  the current deterministic engine as a fast fallback / cold-start default.
- Add authentication and per-user cloud sync of transactions and unlocked
  achievements.
- Persist and animate real month-over-month Wrapped history instead of a
  single current-month snapshot.
- Notifications ("You just unlocked Midnight Menace") and a lightweight
  admin dashboard for managing roast templates without a code deploy.
- Payments/subscription tier for a "Pro Roast" mode with deeper analytics.
