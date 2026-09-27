import { supabase } from './supabaseClient'

const firstOfMonth = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const normalizeBudget = (row = {}) => ({
  id: row.id,
  user_id: row.user_id,
  category: row.category,
  monthly_limit: Number(row.monthly_limit) || 0,
  period_month: String(row.period_month || '').slice(0, 10),
  created_at: row.created_at,
  updated_at: row.updated_at,
})

export async function fetchUserBudgets(userId, periodMonth = firstOfMonth()) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('period_month', periodMonth)
    .order('category', { ascending: true })

  if (error) {
    console.error('[Budgets] fetchUserBudgets failed:', error)
    throw error
  }
  return (data || []).map(normalizeBudget)
}

export async function upsertUserBudget(userId, { category, monthly_limit, period_month }) {
  if (!supabase || !userId) throw new Error('You must be signed in to set a budget.')
  const limit = Number(monthly_limit)
  if (!Number.isFinite(limit) || limit <= 0) throw new Error('Budget must be greater than zero.')
  if (!category) throw new Error('Pick a category.')

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { user_id: userId, category, monthly_limit: limit, period_month: period_month || firstOfMonth() },
      { onConflict: 'user_id,category,period_month' },
    )
    .select()

  if (error) {
    console.error('[Budgets] upsertUserBudget failed:', error)
    throw error
  }
  if (!Array.isArray(data) || data.length === 0) throw new Error('Budget was not saved.')
  return normalizeBudget(data[0])
}

export async function deleteUserBudget(userId, budgetId) {
  if (!supabase || !userId || !budgetId) throw new Error('Missing budget information.')

  const { data, error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId)
    .eq('user_id', userId)
    .select('id')

  if (error) {
    console.error('[Budgets] deleteUserBudget failed:', error)
    throw error
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('This budget could not be removed.')
  }
}

export async function copyBudgetsFromMonth(userId, sourceMonth, targetMonth) {
  if (!supabase || !userId) throw new Error('You must be signed in.')
  const source = await fetchUserBudgets(userId, sourceMonth)
  if (!source.length) return []

  const rows = source.map((b) => ({
    user_id: userId,
    category: b.category,
    monthly_limit: b.monthly_limit,
    period_month: targetMonth,
  }))

  const { data, error } = await supabase
    .from('budgets')
    .upsert(rows, { onConflict: 'user_id,category,period_month' })
    .select()

  if (error) {
    console.error('[Budgets] copyBudgetsFromMonth failed:', error)
    throw error
  }
  return (data || []).map(normalizeBudget)
}

export { firstOfMonth }