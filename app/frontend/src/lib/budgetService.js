import { supabase } from './supabaseClient'
import { parseCalendarDate } from '../utils/localDate.js'

export const firstOfMonth = (date = new Date()) => {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      throw new Error('A valid budget month is required.')
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}-01`
  }
  if (typeof date === 'string') {
    const trimmed = date.trim()
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [yearStr, monthStr] = trimmed.split('-')
      const month = Number(monthStr)
      if (month < 1 || month > 12) {
        throw new Error('A valid budget month is required.')
      }
      return `${trimmed}-01`
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = parseCalendarDate(trimmed)
      if (!parsed) {
        throw new Error('A valid budget month is required.')
      }
      const year = parsed.getFullYear()
      const month = String(parsed.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}-01`
    }
  }
  throw new Error('A valid budget month is required.')
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
  const canonicalMonth = firstOfMonth(periodMonth)
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('period_month', canonicalMonth)
    .order('category', { ascending: true })

  if (error) {
    console.error('[Budgets] fetchUserBudgets failed:', error)
    throw error
  }
  return (data || []).map(normalizeBudget)
}

export async function upsertUserBudget(userId, { category, monthly_limit, period_month }) {
  const cat = String(category || '').trim()
  if (!cat) throw new Error('Pick a category.')
  const limit = Number(monthly_limit)
  if (!Number.isFinite(limit) || limit <= 0) throw new Error('Budget must be greater than zero.')
  const canonicalMonth = firstOfMonth(period_month || new Date())

  if (!supabase || !userId) throw new Error('You must be signed in to set a budget.')

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { user_id: userId, category: cat, monthly_limit: limit, period_month: canonicalMonth },
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
  const canonicalSource = firstOfMonth(sourceMonth)
  const canonicalTarget = firstOfMonth(targetMonth)
  if (!supabase || !userId) throw new Error('You must be signed in.')
  const source = await fetchUserBudgets(userId, canonicalSource)
  if (!source.length) return []

  const rows = source.map((b) => ({
    user_id: userId,
    category: b.category,
    monthly_limit: b.monthly_limit,
    period_month: canonicalTarget,
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