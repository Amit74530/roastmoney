const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tsycpkdixtjxxkjlwsww.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeWNwa2RpeHRqeHhramx3c3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQ5ODAsImV4cCI6MjEwNDAwMDk4MH0.C84ZK9OYQtEwOfLptQwmUDWos0SiTDo_6SnK_vgYyw8'

const createSupabaseClient = () => {
  if (!window.supabase) {
    console.error('[Supabase] CDN is not loaded. Ensure the Supabase script is present before the app loads.')
    return null
  }

  return window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createSupabaseClient()

export const getSupabaseSession = async () => {
  if (!supabase) {
    return { data: { session: null }, error: new Error('Supabase client is unavailable.') }
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('[Supabase] getSession failed:', error)
  }
  return { data, error }
}

export const getSupabaseUser = async () => {
  if (!supabase) {
    return { data: { user: null }, error: new Error('Supabase client is unavailable.') }
  }

  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('[Supabase] getUser failed:', error)
  }
  return { data, error }
}
