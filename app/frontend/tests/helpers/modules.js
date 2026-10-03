import { registerHooks } from 'node:module'

// Production imports are resolved by Vite. Match its relative .js resolution
// without changing application imports or loading the real network client.
export const database = { from: () => { throw new Error('Unexpected database call') } }
globalThis.__financeTestDatabase = database

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/supabaseClient') || specifier.endsWith('/supabaseClient.js')) {
      return {
        url: 'data:text/javascript,export const supabase = globalThis.__financeTestDatabase',
        shortCircuit: true,
      }
    }
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !specifier.endsWith('.js')) {
        return nextResolve(`${specifier}.js`, context)
      }
      throw error
    }
  },
})
