(function () {
  // ==========================================
  // GET SUPABASE CLIENT
  // ==========================================

  function getSupabaseClient() {
    const client =
      window.RoastMoneySupabase &&
      typeof window.RoastMoneySupabase.getClient === "function"
        ? window.RoastMoneySupabase.getClient()
        : null;

    if (!client) {
      console.error(
        "[RoastMoney Auth] Supabase client not available. Make sure supabase.js loads before auth.js."
      );
    }

    return client;
  }

  // ==========================================
  // ERROR LOGGER
  // ==========================================

  function logSupabaseError(context, error) {
    console.error(`[RoastMoney Auth] ${context}`, error);
    return error;
  }

  // ==========================================
  // SIGN UP
  // ==========================================

  async function signUp({ email, password, name, ...metadata }) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        data: null,
        error: new Error("Supabase client is unavailable.")
      };
    }

    if (!email || !password) {
      return {
        data: null,
        error: new Error("Email and password are required.")
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || "",
          ...metadata
        }
      }
    });

    if (error) {
      logSupabaseError("signUp failed", error);
    }

    return { data, error };
  }

  // ==========================================
  // SIGN IN
  // ==========================================

  async function signIn({ email, password }) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        data: null,
        error: new Error("Supabase client is unavailable.")
      };
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      logSupabaseError("signIn failed", error);
    }

    return { data, error };
  }

  // ==========================================
  // SIGN OUT
  // ==========================================

  async function signOut() {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        error: new Error("Supabase client is unavailable.")
      };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      logSupabaseError("signOut failed", error);
    }

    return { error };
  }

  // ==========================================
  // GET CURRENT USER
  // ==========================================

  async function getCurrentUser() {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        data: null,
        error: new Error("Supabase client is unavailable.")
      };
    }

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      logSupabaseError("getCurrentUser failed", error);
    }

    return { data, error };
  }

  // ==========================================
  // CHECK SESSION
  // ==========================================

  async function checkAuthSession() {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        data: null,
        error: new Error("Supabase client is unavailable.")
      };
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      logSupabaseError("checkAuthSession failed", error);
    }

    return { data, error };
  }

  // ==========================================
  // CREATE PROFILE
  // ==========================================

  async function createProfileIfMissing(profile) {
    const supabase = getSupabaseClient();

    if (!supabase || !profile || !profile.id) {
      return {
        data: null,
        error: new Error("Profile payload is invalid.")
      };
    }

    const payload = {
      id: profile.id,
      name: profile.name || "",
      email: profile.email || "",
      created_at: profile.created_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, {
        onConflict: "id"
      });

    if (error) {
      logSupabaseError("createProfileIfMissing failed", error);
    }

    return { data, error };
  }

  // ==========================================
  // SAVE TRANSACTION
  // ==========================================

  async function saveTransaction(transaction) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        data: null,
        error: new Error("Supabase client is unavailable.")
      };
    }

    if (!transaction) {
      return {
        data: null,
        error: new Error("Transaction payload is invalid.")
      };
    }

    if (!transaction.user_id) {
      return {
        data: null,
        error: new Error("User ID is missing.")
      };
    }

    /*
      IMPORTANT:

      Your Supabase database uses:

      title
      amount
      category
      type
      transaction_date
      created_at

      We DO NOT send "description" to Supabase.
    */

    const payload = {
      id: transaction.id || crypto.randomUUID(),

      user_id: transaction.user_id,

      // UI uses "description"
      // Database uses "title"
      title: transaction.title || transaction.description || "",

      amount: Number(transaction.amount) || 0,

      category: transaction.category || "Other",

      type: transaction.type || "expense",

      transaction_date:
        transaction.transaction_date ||
        transaction.date ||
        new Date().toISOString().split("T")[0],

      created_at:
        transaction.created_at ||
        new Date().toISOString()
    };

    console.log(
      "[RoastMoney] Sending transaction to Supabase:",
      payload
    );

    const { data, error } = await supabase
      .from("transactions")
      .insert([payload])
      .select();

    if (error) {
      logSupabaseError("saveTransaction failed", error);

      return {
        data: null,
        error
      };
    }

    console.log(
      "[RoastMoney] Transaction saved successfully:",
      data
    );

    return {
      data,
      error: null
    };
  }

  // ==========================================
  // UPDATE TRANSACTION
  // ==========================================

  async function updateTransaction(transaction) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        data: null,
        error: new Error("Supabase client is unavailable.")
      };
    }

    if (!transaction || !transaction.id) {
      return {
        data: null,
        error: new Error(
          "Transaction ID is required for updating."
        )
      };
    }

    /*
      Explicit fields only.

      DO NOT use:
      ...transaction

      This prevents "description" from being
      accidentally sent to Supabase.
    */

    const payload = {
      title: transaction.title || transaction.description || "",

      amount: Number(transaction.amount) || 0,

      category: transaction.category || "Other",

      type: transaction.type || "expense",

      transaction_date:
        transaction.transaction_date ||
        transaction.date ||
        new Date().toISOString().split("T")[0]
    };

    console.log(
      "[RoastMoney] Updating transaction:",
      transaction.id,
      payload
    );

    const { data, error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", transaction.id)
      .select();

    if (error) {
      logSupabaseError("updateTransaction failed", error);
    }

    return { data, error };
  }

  // ==========================================
  // DELETE TRANSACTION
  // ==========================================

  async function deleteTransaction(id) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return {
        data: null,
        error: new Error("Supabase client is unavailable.")
      };
    }

    if (!id) {
      return {
        data: null,
        error: new Error("Transaction ID is required.")
      };
    }

    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      logSupabaseError("deleteTransaction failed", error);
    }

    return { data, error };
  }

  // ==========================================
  // EXPOSE FUNCTIONS
  // ==========================================

  window.RoastMoneyAuth = {
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    checkAuthSession,
    createProfileIfMissing,
    saveTransaction,
    updateTransaction,
    deleteTransaction
  };
})();