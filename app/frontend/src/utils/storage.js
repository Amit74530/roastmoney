import { demoData } from '../data/demoData'

const KEYS = { user: 'roast-user', transactions: 'roast-transactions', preferences: 'roast-preferences' }
const PREFERENCES_EVENT = 'roast-preferences'

const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
export const getUser = () => read(KEYS.user, null)
export const saveUser = (user) => localStorage.setItem(KEYS.user, JSON.stringify(user))
export const clearUser = () => localStorage.removeItem(KEYS.user)
export const getTransactions = () => read(KEYS.transactions, demoData.transactions)
export const saveTransactions = (items) => localStorage.setItem(KEYS.transactions, JSON.stringify(items))
export const getPreferences = () => read(KEYS.preferences, { intensity: 'SAVAGE', theme: 'system' })
export const savePreferences = (value) => {
  localStorage.setItem(KEYS.preferences, JSON.stringify(value))
  window.dispatchEvent(new Event(PREFERENCES_EVENT))
}
export const subscribePreferences = (callback) => {
  window.addEventListener(PREFERENCES_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(PREFERENCES_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
