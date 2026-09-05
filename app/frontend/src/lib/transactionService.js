import { supabase } from './supabaseClient'

const normalizeTransaction = (row = {}) => {
  const type = row.type === 'income' ? 'income' : 'expense'
  const amount = Number(row.amount) || 0
  const dateValue = row.transaction_date || row.date || row.created_at || new Date().toISOString()
  const dateString = String(dateValue).slice(0, 10)

  return {
    id: row.id,
    user_id: row.user_id || null,
    type,
    amount,
    category: row.category || 'Other',
    description: row.description || row.merchant || 'Transaction',
    merchant: row.description || row.merchant || 'Transaction',
    notes: row.notes || '',
    date: dateString,
    time: row.time || String(dateValue).slice(11, 16) || '00:00',
    transaction_date: dateString,
    created_at: row.created_at || new Date().toISOString(),
  }
}

export async function fetchUserTransactions(userId) {
  if (!supabase || !userId) {
    return []
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Transactions] fetchUserTransactions failed:', error)
    throw error
  }

  return (data || []).map(normalizeTransaction)
}

export async function createUserTransaction(userId, payload) {
  if (!supabase || !userId) {
    throw new Error('You must be signed in to add a transaction.')
  }

  const nextAmount = Number(payload.amount) || 0
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    throw new Error('Transaction amount must be greater than zero.')
  }

  const type = payload.type === 'income' ? 'income' : 'expense'
  const dateValue = payload.transaction_date || payload.date || new Date().toISOString()
  const transactionDate = String(dateValue).slice(0, 10)

  const row = {
    user_id: userId,
    type,
    amount: nextAmount,
    category: payload.category || 'Other',
    description: payload.description || payload.merchant || 'Transaction',
    transaction_date: transactionDate,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([row])
    .select()

  if (error) {
    console.error('[Transactions] createUserTransaction failed:', error)
    throw error
  }

  return (data || []).map(normalizeTransaction)
}

export async function updateUserTransaction(userId, transactionId, payload) {
  if (!supabase || !userId || !transactionId) {
    throw new Error('Missing user or transaction information.')
  }

  const nextAmount = Number(payload.amount)
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    throw new Error('Transaction amount must be greater than zero.')
  }

  const dateValue = payload.transaction_date || payload.date
  const row = {
    type: payload.type === 'income' ? 'income' : 'expense',
    amount: nextAmount,
    category: payload.category || 'Other',
    description: payload.description || payload.merchant || 'Transaction',
    transaction_date: String(dateValue).slice(0, 10),
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(row)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select()

  if (error) {
    console.error('[Transactions] updateUserTransaction failed:', error)
    throw error
  }

  return (data || []).map(normalizeTransaction)
}

export async function deleteUserTransaction(userId, transactionId) {
  if (!supabase || !userId || !transactionId) {
    throw new Error('Missing user or transaction information.')
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId)

  if (error) {
    console.error('[Transactions] deleteUserTransaction failed:', error)
    throw error
  }
}
