import { supabase } from './supabaseClient'

const toDateString = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

const normalizeTransaction = (row = {}) => {
  const type = row.type === 'income' ? 'income' : 'expense'
  const amount = Number(row.amount) || 0
  const explicitTitle = String(row.title || row.merchant || '').trim()
  const storedDescription = String(row.description || '').trim()
  const title = explicitTitle || storedDescription || 'Transaction'
  const description = explicitTitle ? storedDescription : ''

  return {
    id: row.id,
    user_id: row.user_id || null,
    title,
    amount,
    type,
    category: row.category || 'Other',
    transaction_date: toDateString(row.transaction_date || row.date || row.created_at),
    created_at: row.created_at || new Date().toISOString(),
    description,
  }
}

const buildWritePayload = (payload) => {
  const title = String(payload.title || payload.merchant || '').trim() || 'Transaction'
  const notes = String(payload.notes ?? payload.description ?? '').trim()
  const type = payload.type === 'income' ? 'income' : 'expense'
  const amount = Number(payload.amount)
  const transactionDate = toDateString(payload.transaction_date || payload.date)

  return {
    title,
    amount,
    type,
    category: payload.category || 'Other',
    transaction_date: transactionDate,
    description: notes && notes !== title ? notes : null,
  }
}

const requireReturnedRows = (data, action) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Supabase returned no rows after ${action}. The transaction was not saved.`)
  }
  return data.map(normalizeTransaction)
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

  const row = {
    ...buildWritePayload(payload),
    amount: nextAmount,
    user_id: userId,
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([row])
    .select()

  if (error) {
    console.error('[Transactions] createUserTransaction failed:', error)
    throw error
  }

  return requireReturnedRows(data, 'create')
}

export async function updateUserTransaction(userId, transactionId, payload) {
  if (!supabase || !userId || !transactionId) {
    throw new Error('Missing user or transaction information.')
  }

  const nextAmount = Number(payload.amount)
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    throw new Error('Transaction amount must be greater than zero.')
  }

  const row = {
    ...buildWritePayload(payload),
    amount: nextAmount,
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

  return requireReturnedRows(data, 'update')
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
