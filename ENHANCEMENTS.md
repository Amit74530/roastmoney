# ROAST.MONEY — Enhancement Roadmap

**Generated:** 2026-09-18  
**Project State:** Two implementations — Vanilla JS (root) + React + Capacitor (app/frontend)

---

## 📊 Executive Summary

| Area | Status | Priority |
|------|--------|----------|
| **Vanilla JS Prototype** | Debugged & Running | Maintenance |
| **React + Capacitor App** | Feature-complete, needs polish | Primary focus |
| **Supabase Integration** | Auth works, transactions partial | High |
| **RoastScan (OCR)** | Android share intent only | Medium |
| **Design System** | Comprehensive tokens | Extend |

---

## 🎯 Quick Wins (1-2 days each)

### 1. **Toast Notifications in React App** — Missing
- Vanilla has `showToast()` with 4 types (success/error/warning/info)
- React app uses inline toast in Dashboard only
- **Fix:** Create `useToast` hook + `<Toaster />` component

### 2. **Consistent Transaction Categories** — Drifted
| Vanilla | React |
|---------|-------|
| food_dining | Food |
| transportation | Transport |
| shopping | Shopping |
| bills_utilities | Bills |
| subscriptions | Subscriptions |
| entertainment | Entertainment |
| other | Other |
| income | (implicit by amount > 0) |
- **Fix:** Single source of truth in shared config

### 3. **Shared Roast/Personality Engines** — Duplicated
- Vanilla: `js/roast-engine.js` + `js/personality-engine.js`
- React: `lib/engines/roastEngine.js` + `lib/engines/personalityEngine.js`
- **Fix:** Extract to npm package or shared folder, import in both

### 4. **Error Boundaries** — Missing in React
- No error boundary wrapping routes
- **Fix:** Add `<ErrorBoundary>` to each route in `App.jsx`

### 5. **Loading Skeletons** — Partial
- Vanilla has `.skeleton` CSS but unused
- React has no skeleton loaders
- **Fix:** Add skeleton variants for dashboard cards, charts, lists

---

## 🏗️ Medium Improvements (1-2 weeks each)

### 6. **Real Charting Library** — Placeholders Only
- Both apps have `chart-placeholder` divs
- **Options:** Chart.js (simple), Recharts (React-native), uPlot (performant)
- **Recommendation:** Recharts for React, uPlot for vanilla (no deps)

### 7. **Offline-First / PWA** — Not Implemented
- No service worker, no IndexedDB cache
- **Fix:** Add Workbox (React) or custom SW (vanilla); cache transactions locally

### 8. **RoastScan OCR Enhancement** — Basic
- Currently: Android share intent → base64 → serverless function (not shown)
- **Improvements:**
  - Client-side Tesseract.js fallback
  - Better UPI format parsing (PhonePe, GPay, Paytm, BHIM)
  - Confidence scoring UI (already has `scan_confidence`)

### 9. **Transaction Import** — Manual Only
- No CSV/OFX/bank API import
- **Fix:** Add Plaid/Yodlee (paid) or CSV parser + column mapping UI

### 10. **Notifications System** — None
- No push, email, or in-app notifications
- **Fix:** Supabase Realtime + Expo push (mobile) or Web Push API

---

## 🚀 Major Features (Month+ each)

### 11. **Budgets & Goals** — Missing Core Feature
- Only "budget variance" vs hardcoded ₹50k
- **Need:** User-defined monthly budgets per category, rollover, alerts

### 12. **Multi-Account / Linked Accounts** — Single Ledger
- No account concept (wallet, bank, card, UPI)
- **Fix:** Add `account_id` to transactions, account selector in forms

### 13. **Recurring Transactions** — Not Supported
- Subscriptions tracked but not auto-generated
- **Fix:** Recurring rule engine (cron-like), auto-create monthly

### 14. **Shared / Household Budgets** — Solo Only
- No multi-user, no shared categories
- **Fix:** Supabase RLS policies for household groups

### 15. **Data Export / Reports** — None
- No PDF, CSV, Excel export
- **Fix:** Add export buttons using SheetJS / jsPDF

### 16. **AI-Enhanced Roasts** — Deterministic Only
- Phase 2 in README mentions LLM fallback
- **Implementation:** Edge function → OpenAI/Claude with prompt template + current engine as fallback

---

## 🎨 Design & UX Polish

### 17. **Dark/Light Theme Parity** — Incomplete
- Vanilla: CSS `@media (prefers-color-scheme: light)` tokens
- React: `data-theme` on `<html>` but some components hardcode colors
- **Audit:** All components for theme compliance

### 18. **Animation Consistency** — Mixed
- Vanilla: `Motion` (scroll-reveal, magnetic, count-up)
- React: CSS transitions only, no intersection observer
- **Fix:** Port `Motion` utilities to React hooks

### 19. **Accessibility Audit** — Partial
- Skip links exist
- Missing: ARIA live regions for toasts, focus trap in modals, color contrast verification

### 20. **Mobile Gestures** — Basic
- No swipe-to-delete, pull-to-refresh, haptic feedback
- **Fix:** Add `react-use-gesture` or similar

---

## 🔧 Technical Debt & Architecture

### 21. **State Management** — Prop Drilling
- React: `transactions` passed through 4-5 levels
- **Fix:** React Context + `useReducer` or Zustand (lightweight)

### 22. **TypeScript Migration** — JS Only
- No type safety
- **Fix:** Rename `.jsx` → `.tsx`, add strict TS config

### 23. **Test Coverage** — Zero
- No unit, integration, or E2E tests
- **Fix:** Vitest (unit), Playwright (E2E)

### 24. **Bundle Size** — Unknown
- No bundle analysis
- **Fix:** `vite-bundle-analyzer`, code-split routes

### 25. **Capacitor Plugins** — Minimal
- Only ShareReceiver for RoastScan
- **Potential:** Biometric auth, Secure Storage, Background Sync, Local Notifications

---

## 📱 Android-Specific (Capacitor)

| Feature | Status | Notes |
|---------|--------|-------|
| Splash screen | ✅ Configured | Custom splash.png exists |
| App icon | ✅ Configured | ic_launcher + round |
| Share intent (RoastScan) | ✅ Working | `SEND` + `image/*` |
| Permissions | ⚠️ Internet only | Add CAMERA for future OCR |
| Biometric auth | ❌ | Capacitor Biometric plugin |
| Push notifications | ❌ | Capacitor Push + Firebase |
| Background sync | ❌ | WorkManager via Capacitor |
| Secure storage | ❌ | Capacitor Preferences/Secure Storage |
| Deep links | ❌ | For share-to-app flow |

---

## 💾 Database Schema (Supabase)

### Current `transactions` table (inferred):
```sql
id, user_id, title, amount, category, type, transaction_date, created_at,
merchant, description, payment_method, reference_id, source, scan_confidence
```

### Recommended Additions:
```sql
-- Budgets
budgets: id, user_id, category, monthly_limit, period_start, rollover, created_at

-- Recurring rules
recurring_rules: id, user_id, title, amount, category, type, frequency, day_of_month, next_date, is_active

-- Accounts
accounts: id, user_id, name, type (wallet/bank/card/upi), balance, currency, color, is_default

-- Households
households: id, name, owner_id, created_at
household_members: household_id, user_id, role, joined_at

-- Notifications
notifications: id, user_id, type, title, body, data, read_at, created_at
```

---

## 🔐 Security & Privacy

### 26. **RLS Policies** — Need Review
- Current: Basic user_id isolation
- **Audit:** All tables for proper RLS, especially if households added

### 27. **Secrets Management** — .env Only
- Supabase keys in code (anon key OK, but env vars better)
- **Fix:** Move to `.env` + Vite `import.meta.env`

### 28. **Content Security Policy** — None
- **Fix:** Add CSP headers via meta tag or server config

---

## 📈 Analytics & Observability

### 29. **Error Tracking** — Console Only
- **Fix:** Sentry (free tier) for both web + Android

### 30. **Product Analytics** — None
- **Fix:** PostHog / Plausible / custom events for key funnels

### 31. **Performance Monitoring** — None
- **Fix:** Web Vitals + custom marks for critical paths

---

## 🧪 Testing Strategy

| Layer | Tool | Target |
|-------|------|--------|
| Unit | Vitest | Engines, utils, calculations |
| Component | React Testing Library | Pages, components |
| Integration | Playwright | Auth flow, transaction CRUD |
| E2E | Playwright | Critical user journeys |
| Visual | Chromatic / Percy | Design system components |

---

## 📦 Monorepo Structure (Recommended)

```
roastmoney/
├── packages/
│   ├── core/              # Shared engines, types, utils
│   │   ├── roast-engine/
│   │   ├── personality-engine/
│   │   ├── transaction-adapter/
│   │   └── types/
│   ├── design-tokens/     # CSS variables, Tailwind config
│   └── ui-components/     # Shared React components
├── apps/
│   ├── vanilla/           # Current root (legacy)
│   ├── web/               # React + Vite (current app/frontend)
│   └── mobile/            # Capacitor (current app/frontend/android)
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
└── turbo.json             # Turborepo config
```

---

## 🎯 Recommended Next Steps (Priority Order)

1. **Week 1:** Fix toast system, unify categories, add error boundaries
2. **Week 2:** Add Recharts, skeleton loaders, theme audit
3. **Week 3:** Offline support (SW + IndexedDB), CSV import
4. **Week 4:** Budgets feature + recurring transactions
5. **Month 2:** TypeScript migration + test setup
6. **Month 3:** AI roasts + household sharing + push notifications

---

## 📝 Notes on Current Fixes Applied (2026-09-18)

### Vanilla JS (Root)
- ✅ Added `initNav()` to `animations.js` with nav link handlers
- ✅ Added `showLoadingState()`, `hideLoadingStates()`, `showAuthError()` to `app.js`
- ✅ Fixed `or` → `||` in `getCategoryIcon()` and `getCategoryLabel()`
- ✅ Removed unused `type` parameter from `createChartPlaceholder()`
- ✅ Added `getToastIcon()` helper
- ✅ Added `.toast` CSS styles to `components.css`
- ✅ Added Supabase transaction methods (`getTransactions`, `addTransaction`, `updateTransaction`, `deleteTransaction`) to `supabase.js`

### Supabase Schema Note
The vanilla app expects a `transactions` table with columns matching `RoastMoneySupabase` methods. Ensure Supabase has:
```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text,
  amount numeric,
  category text,
  type text check (type in ('income','expense')),
  transaction_date date,
  created_at timestamptz default now(),
  merchant text,
  description text,
  payment_method text,
  reference_id text,
  source text,
  scan_confidence numeric
);
alter table transactions enable row level security;
create policy "Users can CRUD own transactions" on transactions
  for all using (auth.uid() = user_id);
```