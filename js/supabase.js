(function () {
  // Use only the publishable/anon key in browser code. The service_role key must never
  // be exposed in a frontend application, as it would allow unrestricted database access.
  const SUPABASE_URL = "https://tsycpkdixtjxxkjlwsww.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeWNwa2RpeHRqeHhramx3c3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQ5ODAsImV4cCI6MjEwNDAwMDk4MH0.C84ZK9OYQtEwOfLptQwmUDWos0SiTDo_6SnK_vgYyw8";

  const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  if (!supabaseClient) {
    console.error('[Supabase] Failed to initialize the client. Check that the CDN loaded before this script.');
  }

  // Transaction database methods
  async function getTransactions(userId) {
    if (!supabaseClient) {
      return { data: null, error: new Error('Supabase client unavailable') };
    }
    const { data, error } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });
    return { data, error };
  }

  async function addTransaction(transaction) {
    if (!supabaseClient) {
      return { data: null, error: new Error('Supabase client unavailable') };
    }
    const { data, error } = await supabaseClient
      .from('transactions')
      .insert([transaction])
      .select();
    return { data, error };
  }

  async function updateTransaction(id, updates) {
    if (!supabaseClient) {
      return { data: null, error: new Error('Supabase client unavailable') };
    }
    const { data, error } = await supabaseClient
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select();
    return { data, error };
  }

  async function deleteTransaction(id) {
    if (!supabaseClient) {
      return { data: null, error: new Error('Supabase client unavailable') };
    }
    const { data, error } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', id);
    return { data, error };
  }

  window.RoastMoneySupabase = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    supabase: supabaseClient,
    getClient() {
      if (!window.RoastMoneySupabase.supabase) {
        console.error('[Supabase] The client is unavailable. Confirm the Supabase JS CDN loaded correctly.');
        return null;
      }
      return window.RoastMoneySupabase.supabase;
    },
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };

  window.supabaseClient = supabaseClient;
})();
