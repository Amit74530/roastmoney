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
  };

  window.supabaseClient = supabaseClient;
})();
