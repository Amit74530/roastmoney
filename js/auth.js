(function () {
  function getSupabaseClient() {
    const client = window.RoastMoneySupabase && window.RoastMoneySupabase.getClient
      ? window.RoastMoneySupabase.getClient()
      : null;

    if (!client) {
      console.error('[Supabase Auth] No Supabase client available. Ensure js/supabase.js is loaded before this file.');
    }

    return client;
  }

  function logSupabaseError(context, error) {
    console.error(`[Supabase Auth] ${context}`, error);
    return error;
  }

  async function signUp({ email, password, name, ...metadata }) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is unavailable.') };
    }

    if (!email || !password) {
      return { data: null, error: new Error('Email and password are required.') };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
          ...metadata,
        },
      },
    });

    if (error) {
      logSupabaseError('signUp failed', error);
    }

    return { data, error };
  }

  async function signIn({ email, password }) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is unavailable.') };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logSupabaseError('signIn failed', error);
    }

    return { data, error };
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: new Error('Supabase client is unavailable.') };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      logSupabaseError('signOut failed', error);
    }

    return { error };
  }

  async function getCurrentUser() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is unavailable.') };
    }

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      logSupabaseError('getCurrentUser failed', error);
    }

    return { data, error };
  }

  async function checkAuthSession() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is unavailable.') };
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      logSupabaseError('checkAuthSession failed', error);
    }

    return { data, error };
  }

  async function createProfileIfMissing(profile) {
    const supabase = getSupabaseClient();
    if (!supabase || !profile || !profile.id) {
      return { data: null, error: new Error('Profile payload is invalid.') };
    }

    const payload = {
      id: profile.id,
      name: profile.name || '',
      email: profile.email || '',
      created_at: new Date().toISOString(),
      ...profile,
    };

    const { data, error } = await supabase.from('profiles').upsert(payload, {
      onConflict: 'id',
    });

    if (error) {
      logSupabaseError('createProfileIfMissing failed', error);
    }

    return { data, error };
  }

  async function saveTransaction(transaction) {
    const supabase = getSupabaseClient();
    if (!supabase || !transaction || !transaction.user_id) {
      return { data: null, error: new Error('Transaction payload is invalid.') };
    }

    const payload = {
      id: transaction.id || crypto.randomUUID(),
      user_id: transaction.user_id,
      amount: Number(transaction.amount),
      category: transaction.category || 'Other',
      description: transaction.description || '',
      type: transaction.type || 'expense',
      date: transaction.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...transaction,
    };

    const { data, error } = await supabase.from('transactions').insert([payload]);

    if (error) {
      logSupabaseError('saveTransaction failed', error);
    }

    return { data, error };
  }

  window.RoastMoneyAuth = {
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    checkAuthSession,
    createProfileIfMissing,
    saveTransaction,
  };
})();
