export const categories = ['Food', 'Shopping', 'Transport', 'Subscriptions', 'Entertainment', 'Bills', 'Other']

const tx = (id, merchant, category, amount, date, time) => ({ id, merchant, category, amount, date, time })

export const demoTransactions = [
  tx('tx-01', 'Swiggy', 'Food', 749, '2026-08-31', '23:48'),
  tx('tx-02', 'Amazon', 'Shopping', 2499, '2026-08-30', '18:21'),
  tx('tx-03', 'Netflix', 'Subscriptions', 649, '2026-08-29', '00:03'),
  tx('tx-04', 'Uber', 'Transport', 328, '2026-08-29', '21:16'),
  tx('tx-05', 'Myntra', 'Shopping', 1899, '2026-08-27', '22:45'),
  tx('tx-06', 'Zomato', 'Food', 512, '2026-08-26', '13:10'),
  tx('tx-07', 'Spotify', 'Subscriptions', 119, '2026-08-25', '00:04'),
  tx('tx-08', 'BookMyShow', 'Entertainment', 900, '2026-08-24', '21:20'),
  tx('tx-09', 'BigBasket', 'Food', 2340, '2026-08-22', '10:40'),
  tx('tx-10', 'Croma', 'Shopping', 12999, '2026-08-21', '18:00'),
  tx('tx-11', 'Ola', 'Transport', 260, '2026-08-20', '08:00'),
  tx('tx-12', 'Starbucks', 'Food', 460, '2026-08-18', '09:15'),
]

export const demoData = {
  user: { name: 'Amit Karki', email: 'amit@example.com', initials: 'AK' },
  transactions: demoTransactions,
  personality: { title: 'THE EMOTIONAL SPENDER', impulse: 78, discipline: 34, chaos: 91 },
  achievements: [
    { title: 'MIDNIGHT MENACE', description: 'Spent money after midnight.', icon: 'moon', unlocked: true },
    { title: 'SPEED RUN', description: 'Five purchases in one sitting.', icon: 'bolt', unlocked: true },
    { title: 'SMALL EXPENSE COLLECTOR', description: 'Make 10 purchases under ₹100.', icon: 'lock', progress: '2 / 10' },
    { title: 'FOOD MINISTER', description: 'Spend ₹10,000 on food.', icon: 'lock', progress: '₹9,148 / ₹10,000' },
  ],
}
