import assert from 'node:assert/strict'
import test from 'node:test'
import { database } from './helpers/modules.js'

const { calculateFinancialSummary, calculateMonthlyOverview, transactionCalendarDate } = await import('../src/utils/financialCalculations.js')
const { filterTransactionsByTime, getPreviousPeriodTransactions, buildCategoryBreakdown, buildIncomeExpenseTrend, calculateStatistics } = await import('../src/utils/analyticsCalculations.js')
const { filterTransactionsByMonth, computeBudgetProgress } = await import('../src/utils/budgetCalculations.js')
const { getWrappedData } = await import('../src/utils/financialInsights.js')
const { localDateInputValue, localTimeInputValue } = await import('../src/utils/localDate.js')
const { firstOfMonth, fetchUserBudgets, upsertUserBudget, copyBudgetsFromMonth } = await import('../src/lib/budgetService.js')
const { createUserTransaction, updateUserTransaction } = await import('../src/lib/transactionService.js')
const { mapEngineCategory, toEngineTransaction, toEngineExpenses } = await import('../src/lib/engines/transactionAdapter.js')
const { computeMetrics, computeAchievements } = await import('../src/lib/engines/personalityEngine.js')
const { generateExpenseRoast } = await import('../src/lib/engines/insights.js')

const expense = (amount, transaction_date, category = 'Food') => ({ amount, transaction_date, category, type: 'expense' })

test('empty finance data returns zero totals and empty statistics', () => {
  assert.deepEqual(calculateFinancialSummary([]), { totalIncome: 0, totalExpenses: 0, totalBalance: 0, totalSavings: 0 })
  assert.equal(calculateStatistics([]).highestExpense, null)
  assert.equal(calculateStatistics([{ type: 'income', amount: 10 }]).highestExpense, null)
  assert.deepEqual(getWrappedData([]).topCategory, ['NONE', 0])
})

test('non-finite imported amounts cannot poison totals', () => {
  assert.deepEqual(calculateFinancialSummary([
    { type: 'income', amount: '100.50' },
    expense(-20.25), expense('Infinity'), expense('not a number'),
  ]), { totalIncome: 100.5, totalExpenses: 20.25, totalBalance: 80.25, totalSavings: 80.25 })
})

test('impossible calendar dates do not roll into another reporting period', () => {
  for (const value of ['2026-02-30', '2026-13-01', '2026-00-01', '2026-01-32', '2026-03-01garbage', '2026-3-1', 'not a date']) {
    assert.equal(transactionCalendarDate({ transaction_date: value }), null, value)
  }
  const leapDay = transactionCalendarDate({ date: '2024-02-29' })
  assert.equal(leapDay.getMonth(), 1)
  assert.equal(leapDay.getDate(), 29)
  assert.equal(calculateMonthlyOverview([expense(50, '2026-02-30')], new Date(2026, 2, 2)).totalExpenses, 0)
})

test('analytics ranges include boundaries, exclude future dates, and cross years', () => {
  const transactions = [
    expense(1, '2025-09-30'), expense(2, '2025-10-01'), expense(3, '2025-12-31'),
    expense(4, '2026-01-01'), expense(5, '2026-03-15'), expense(6, '2026-03-16'),
  ]
  const reference = new Date(2026, 2, 15, 23)
  assert.deepEqual(filterTransactionsByTime(transactions, 'three', reference).map((t) => t.amount), [4, 5])
  assert.deepEqual(getPreviousPeriodTransactions(transactions, 'three', reference).map((t) => t.amount), [2, 3])
  assert.deepEqual(getPreviousPeriodTransactions(transactions, 'all', reference), [])
})

test('budget month filtering supports legacy date fields without partial-prefix matches', () => {
  const transactions = [
    { amount: 25, date: '2026-03-10' }, expense(30, '2026-03-31'),
    expense(40, '2026-04-01'), expense(50, '2026-02-30'),
  ]
  assert.deepEqual(filterTransactionsByMonth(transactions, '2026-03-01').map((t) => t.amount), [25, 30])
  assert.deepEqual(filterTransactionsByMonth(transactions, '2026-03').map((t) => t.amount), [25, 30])
  assert.deepEqual(filterTransactionsByMonth(transactions, '2026'), [])
})

test('category totals use Other for missing names and handle object-property names', () => {
  const transactions = [
    expense(10, '2026-03-01', ''),
    { amount: 20, type: 'expense' },
    expense(5, '2026-03-01', '__proto__'),
    expense(7, '2026-03-01', 'constructor'),
    { amount: 99, type: 'income', category: 'Food' },
  ]
  assert.deepEqual(buildCategoryBreakdown(transactions), [
    { name: 'Other', value: 30 }, { name: 'constructor', value: 7 }, { name: '__proto__', value: 5 },
  ])
  const progress = computeBudgetProgress([
    { category: 'Other', monthly_limit: 100 }, { category: '__proto__', monthly_limit: 10 },
  ], transactions)
  assert.equal(progress[0].spent, 30)
  assert.equal(progress[1].spent, 5)
  assert.equal(progress[1].percentage, 50)
  assert.deepEqual(getWrappedData(transactions).topCategory, ['Other', 30])
})

test('date-only input stays on its calendar day west of UTC', () => {
  const previousTimezone = process.env.TZ
  process.env.TZ = 'America/Los_Angeles'
  try {
    assert.equal(localDateInputValue('2026-03-01'), '2026-03-01')
    assert.equal(localDateInputValue(new Date(2026, 2, 1, 0, 15)), '2026-03-01')
    assert.equal(firstOfMonth('2026-03-01'), '2026-03-01')
    assert.equal(firstOfMonth('2026-03'), '2026-03-01')
    assert.equal(firstOfMonth(new Date(2026, 2, 31, 23)), '2026-03-01')
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ
    else process.env.TZ = previousTimezone
  }
})

test('monthly trends reject impossible dates and retain numeric, finite amounts', () => {
  assert.deepEqual(buildIncomeExpenseTrend([
    expense(10, '2025-12-31'), expense('Infinity', '2026-01-01'),
    { amount: '25.50', type: 'income', date: '2026-01-01T00:15:00Z' },
    expense(40, '2026-02-30'),
  ]), [
    { key: '2025-12', label: 'Dec', income: 0, expenses: 10 },
    { key: '2026-01', label: 'Jan', income: 25.5, expenses: 0 },
  ])
})

test('budget progress sanitizes non-finite limits and uses threshold boundaries', () => {
  const budgets = [70, 90, 100, 101].map((spent) => ({ category: String(spent), monthly_limit: '100' }))
  const transactions = budgets.map((b) => expense(Number(b.category), '2026-03-01', b.category))
  assert.deepEqual(computeBudgetProgress(budgets, transactions).map((b) => b.tone), ['warn', 'critical', 'critical', 'over'])
  for (const monthly_limit of ['Infinity', NaN, -20, 0]) {
    const [progress] = computeBudgetProgress([{ category: 'Food', monthly_limit }], [expense(5), expense('Infinity')])
    assert.equal(progress.spent, 5)
    assert.equal(progress.remaining, -5)
    assert.equal(progress.percentage, 0)
  }
})

test('clock input rejects impossible hours and minutes', () => {
  assert.equal(localTimeInputValue('09:05:30'), '09:05')
  assert.equal(localTimeInputValue(new Date(2026, 2, 1, 9, 5)), '09:05')
  for (const time of ['24:00', '12:60', '12:30:99', '12:30junk', new Date(NaN)]) {
    assert.equal(localTimeInputValue(time), '')
  }
})

test('engine adaptation preserves finite amounts and literal object-property categories', () => {
  for (const category of ['__proto__', 'constructor', 'toString']) {
    assert.equal(mapEngineCategory(category), category)
    assert.doesNotThrow(() => generateExpenseRoast(expense(50, '2026-03-01', category)))
  }
  assert.equal(mapEngineCategory('Transport'), 'Travel')
  assert.equal(toEngineTransaction(expense('Infinity', '2026-03-01')).amount, 0)
  assert.equal(toEngineTransaction(expense('-10.5', '2026-03-01')).amount, 10.5)
  const metrics = computeMetrics(toEngineExpenses([expense(5, '2026-03-01', '__proto__'), expense(7, '2026-03-01', 'constructor')]))
  assert.equal(metrics.byCategory.__proto__, 5)
  assert.equal(metrics.byCategory.constructor, 7)
  assert.equal(metrics.total, 12)
})

test('engine adaptation never fabricates a known clock or current transaction date', () => {
  for (const time of ['', '25:00', '12:75', '12:30:99']) {
    const adapted = toEngineTransaction({ ...expense(10, '2026-03-01'), time })
    assert.equal(adapted.hourKnown, false)
    assert.equal(adapted.timestamp, '2026-03-01T12:00:00')
  }
  const known = toEngineTransaction({ ...expense(10, '2026-03-01'), time: '01:30' })
  assert.equal(known.hourKnown, true)
  assert.equal(known.timestamp, '2026-03-01T01:30:00')
  for (const date of [undefined, '2026-02-30']) {
    const adapted = toEngineTransaction({ ...expense(10, date), time: '01:30' })
    assert.equal(adapted.timestamp, '')
    assert.equal(adapted.hourKnown, false)
  }
})

test('unknown transaction times do not inflate burst metrics or unlock timed achievements', () => {
  const expenses = toEngineExpenses(Array.from({ length: 5 }, () => expense(10, '2026-03-01')))
  assert.equal(computeMetrics(expenses).burstRatio, 0)
  const impulse = computeAchievements(expenses).find((item) => item.id === 'impulse-lord')
  assert.equal(impulse.unlocked, false)
  assert.equal(impulse.progress, 0)
  assert.ok(computeAchievements([]).every((item) => !item.unlocked && item.progress === 0))
})

test('impulse achievement requires five purchases in one 30-minute window, not a chain', () => {
  const achievement = (minutes) => computeAchievements(minutes.map((minute) => ({
    amount: 10, category: 'Food', hourKnown: true,
    timestamp: new Date(2026, 2, 1, 12, minute).toISOString(),
  }))).find((item) => item.id === 'impulse-lord')
  assert.equal(achievement([0, 29, 58, 87, 116]).unlocked, false)
  assert.equal(achievement([0, 10, 15, 20, 30]).unlocked, true)
})

const mockDatabase = (t, responseRows) => {
  const calls = []
  const query = {
    then(resolve, reject) { return Promise.resolve({ data: responseRows, error: null }).then(resolve, reject) },
  }
  for (const method of ['select', 'eq', 'order', 'insert', 'update', 'upsert']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query }
  }
  t.mock.method(database, 'from', (table) => { calls.push(['from', table]); return query })
  return calls
}

test('transaction writes reject invalid amounts, dates, and clocks before database access', async () => {
  const valid = { title: 'Lunch', amount: 20, transaction_date: '2026-03-01', time: '12:30' }
  for (const amount of [0, -1, NaN, 'Infinity', '', 'nonsense']) {
    await assert.rejects(createUserTransaction('user', { ...valid, amount }), /amount must be greater than zero/i)
    await assert.rejects(updateUserTransaction('user', 'id', { ...valid, amount }), /amount must be greater than zero/i)
  }
  for (const transaction_date of ['2026-02-30', '2026-13-01', 'not a date']) {
    await assert.rejects(createUserTransaction('user', { ...valid, transaction_date }), /valid transaction date/i)
    await assert.rejects(updateUserTransaction('user', 'id', { ...valid, transaction_date }), /valid transaction date/i)
  }
  for (const time of ['24:01', '12:60', '12:30junk']) {
    await assert.rejects(createUserTransaction('user', { ...valid, time }), /valid transaction time/i)
    await assert.rejects(updateUserTransaction('user', 'id', { ...valid, time }), /valid transaction time/i)
  }
})

test('transaction writes retain local Date values, time, and optional null confidence', async (t) => {
  const calls = mockDatabase(t, [{ id: 'id', title: 'Lunch', amount: 20, transaction_date: '2026-03-01' }])
  await createUserTransaction('user', {
    title: ' Lunch ', amount: '20.00', date: new Date(2026, 2, 1, 23, 30),
    time: '12:30:45', scan_confidence: null,
  })
  const row = calls.find(([method]) => method === 'insert')[1][0]
  assert.equal(row.amount, 20)
  assert.equal(row.transaction_date, '2026-03-01')
  assert.equal(row.transaction_time, '12:30')
  assert.equal(row.scan_confidence, null)
  assert.equal(row.user_id, 'user')
})

test('budget month helpers reject invalid dates before database access', async () => {
  for (const month of ['2026-13', '2026-02-30', 'garbage']) {
    assert.throws(() => firstOfMonth(month), /valid budget month/i)
    await assert.rejects(fetchUserBudgets('user', month), /valid budget month/i)
    await assert.rejects(upsertUserBudget('user', { category: 'Food', monthly_limit: 100, period_month: month }), /valid budget month/i)
    await assert.rejects(copyBudgetsFromMonth('user', '2026-03-01', month), /valid budget month/i)
  }
  await assert.rejects(upsertUserBudget('user', { category: '   ', monthly_limit: 100 }), /pick a category/i)
})

test('budget reads and writes use canonical month keys', async (t) => {
  const calls = mockDatabase(t, [{ category: 'Food', monthly_limit: '100', period_month: '2026-03-01' }])
  await fetchUserBudgets('user', '2026-03')
  assert.ok(calls.some(([method, key, value]) => method === 'eq' && key === 'period_month' && value === '2026-03-01'))
  await upsertUserBudget('user', { category: ' Food ', monthly_limit: '100', period_month: '2026-03-15' })
  const row = calls.find(([method]) => method === 'upsert')[1]
  assert.equal(row.category, 'Food')
  assert.equal(row.period_month, '2026-03-01')
})
