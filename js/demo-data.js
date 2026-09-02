/**
 * demo-data.js
 * Static seed data used until a real backend/import exists.
 * Each transaction: { id, merchant, category, amount, timestamp (ISO), note }
 * Timestamps are spread across August 2026 to power the heatmap + wrapped.
 */

const CATEGORIES = [
  'Food',
  'Shopping',
  'Travel',
  'Entertainment',
  'Subscriptions',
  'Bills',
  'Other',
];

function iso(day, hour, minute) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `2026-08-${d}T${h}:${m}:00`;
}

let __txSeq = 1000;
function nextId() {
  __txSeq += 1;
  return `TX-${__txSeq}`;
}

const RAW_DEMO_TRANSACTIONS = [
  ['Swiggy', 'Food', 749, iso(1, 20, 42)],
  ['Zomato', 'Food', 512, iso(2, 13, 10)],
  ['Blinkit', 'Food', 289, iso(2, 21, 55)],
  ['Starbucks', 'Food', 460, iso(3, 9, 15)],
  ['Swiggy', 'Food', 899, iso(4, 1, 17)],
  ['Myntra', 'Shopping', 2499, iso(5, 15, 40)],
  ['Amazon', 'Shopping', 1249, iso(5, 22, 5)],
  ['Zara', 'Shopping', 4999, iso(6, 17, 30)],
  ['Uber', 'Travel', 340, iso(7, 8, 5)],
  ['Ola', 'Travel', 210, iso(7, 19, 45)],
  ['IndiGo', 'Travel', 6820, iso(8, 6, 0)],
  ['Netflix', 'Subscriptions', 649, iso(1, 0, 3)],
  ['Spotify', 'Subscriptions', 119, iso(1, 0, 4)],
  ['Amazon Prime', 'Subscriptions', 299, iso(9, 11, 0)],
  ['iCloud+', 'Subscriptions', 75, iso(9, 11, 2)],
  ['BESCOM', 'Bills', 1840, iso(10, 10, 0)],
  ['Airtel Postpaid', 'Bills', 599, iso(10, 10, 5)],
  ['BookMyShow', 'Entertainment', 900, iso(11, 21, 20)],
  ['PVR Cinemas', 'Entertainment', 650, iso(12, 22, 40)],
  ['Swiggy', 'Food', 199, iso(13, 14, 5)],
  ['Chai Point', 'Food', 60, iso(13, 16, 30)],
  ['Chai Point', 'Food', 60, iso(14, 16, 32)],
  ['Chai Point', 'Food', 69, iso(15, 16, 20)],
  ['Amazon', 'Shopping', 349, iso(15, 23, 58)],
  ['Myntra', 'Shopping', 1899, iso(16, 20, 12)],
  ['Zepto', 'Food', 129, iso(17, 12, 0)],
  ['Zepto', 'Food', 99, iso(17, 12, 20)],
  ['Uber', 'Travel', 480, iso(18, 23, 40)],
  ['Swiggy', 'Food', 1349, iso(19, 1, 5)],
  ['Big Basket', 'Food', 2340, iso(20, 10, 40)],
  ['Netflix', 'Subscriptions', 649, iso(20, 0, 1)],
  ['Croma', 'Shopping', 12999, iso(21, 18, 0)],
  ['Uber', 'Travel', 150, iso(22, 9, 15)],
  ['Starbucks', 'Food', 320, iso(22, 17, 0)],
  ['Domino\'s', 'Food', 599, iso(23, 22, 10)],
  ['H&M', 'Shopping', 2199, iso(24, 16, 45)],
  ['BookMyShow', 'Entertainment', 450, iso(25, 20, 0)],
  ['BESCOM', 'Bills', 1720, iso(25, 9, 0)],
  ['Swiggy', 'Food', 99, iso(26, 13, 0)],
  ['Swiggy', 'Food', 99, iso(26, 13, 40)],
  ['Amazon', 'Shopping', 799, iso(27, 22, 30)],
  ['Ola', 'Travel', 260, iso(28, 8, 0)],
  ['Spotify', 'Subscriptions', 119, iso(28, 0, 2)],
  ['Random Bar', 'Entertainment', 2499, iso(29, 1, 17)],
  ['Swiggy', 'Food', 429, iso(30, 20, 5)],
  ['Myntra', 'Shopping', 349, iso(31, 11, 0)],
  ['Uber', 'Travel', 220, iso(31, 19, 30)],
];

const DEMO_TRANSACTIONS = RAW_DEMO_TRANSACTIONS.map(([merchant, category, amount, timestamp]) => ({
  id: nextId(),
  merchant,
  category,
  amount,
  timestamp,
  roast: null,       // computed lazily by roast-engine
  intensity: null,   // computed lazily
}));

// A small rotating cast used by the hero "live receipt" ticker — independent
// of the seeded history so the hero always looks alive on load.
const HERO_TICKER_TRANSACTIONS = [
  { merchant: 'Swiggy', category: 'Food', amount: 749, time: '8:42 PM' },
  { merchant: 'Myntra', category: 'Shopping', amount: 2499, time: '11:05 PM' },
  { merchant: 'Uber', category: 'Travel', amount: 340, time: '9:12 AM' },
  { merchant: 'Netflix', category: 'Subscriptions', amount: 649, time: '12:00 AM' },
  { merchant: 'Zepto', category: 'Food', amount: 129, time: '1:38 AM' },
  { merchant: 'Croma', category: 'Shopping', amount: 12999, time: '6:20 PM' },
];
