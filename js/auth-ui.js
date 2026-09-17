/**
 * auth-ui.js
 * Authentication UI components and state management
 * Enhanced for world-class 2026 fintech design system
 */

const AuthUI = (() => {
  let currentUser = null;
  let isLoading = false;
  let errorMessage = '';

  // DOM elements
  let authContainer = null;
  let loginForm = null;
  let signupForm = null;
  let toggleAuthLink = null;
  let authErrorEl = null;
  let authLoadingEl = null;

  // Initialize auth UI
  function init() {
    // Create auth container if it doesn't exist
    authContainer = document.getElementById('auth-container');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.id = 'auth-container';
      document.body.appendChild(authContainer);
    }

    // Listen for auth events from Supabase
    window.addEventListener('auth:success', handleAuthSuccess);
    window.addEventListener('auth:signout', handleAuthSignout);
    window.addEventListener('auth:error', handleAuthError);

    // Render initial state
    render();
  }

  function handleAuthSuccess() {
    render(); // Will show empty state as user is now authenticated
  }

  function handleAuthSignout() {
    render(); // Show auth forms
  }

  function handleAuthError(error) {
    errorMessage = error;
    render();
  }

  // Render authentication forms
  function renderForms() {
    return `
      <div class="auth-card">
        <div class="auth-header">
          <h2 class="auth-title">Welcome to ROAST.MONEY</h2>
          <p class="auth-subtitle">Your money has opinions. Let's hear them.</p>
        </div>

        ${isLoading ? renderLoadingState() : ''}
        ${errorMessage ? renderErrorState() : ''}

        <div class="auth-tabs">
          <button class="auth-tab active" id="login-tab">Sign In</button>
          <button class="auth-tab" id="signup-tab">Create Account</button>
        </div>

        <form id="login-form" class="auth-form active">
          <h3 class="auth-form-title">Sign In</h3>
          <p class="auth-form-subtitle">Access your financial insights</p>

          <div class="form-group">
            <label class="form-label" for="login-email">Email</label>
            <input
              type="email"
              id="login-email"
              class="form-input"
              placeholder="Enter your email"
              required
              autocomplete="email"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              class="form-input"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            >
            <button type="button" class="btn btn-icon auth-toggle-password" aria-label="Show password">
              <span class="btn-icon">👁️</span>
            </button>
          </div>

          <div class="form-group form-checkbox">
            <label class="form-label">
              <input type="checkbox" id="login-remember" class="form-input">
              Remember me
            </label>
          </div>

          <button type="submit" class="btn btn-accent btn-width-full">
            Sign In
          </button>

          <p class="auth-footer">
            Don't have an account? <a href="#" class="auth-link" id="show-signup">Create Account</a>
          </p>
        </form>

        <form id="signup-form" class="auth-form">
          <h3 class="auth-form-title">Create Account</h3>
          <p class="auth-form-subtitle">Start your financial journey</p>

          <div class="form-group">
            <label class="form-label" for="signup-name">Full Name</label>
            <input
              type="text"
              id="signup-name"
              class="form-input"
              placeholder="Enter your full name"
              required
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="signup-email">Email</label>
            <input
              type="email"
              id="signup-email"
              class="form-input"
              placeholder="Enter your email"
              required
              autocomplete="email"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="signup-password">Password</label>
            <input
              type="password"
              id="signup-password"
              class="form-input"
              placeholder="Create a secure password"
              required
              minlength="8"
              autocomplete="new-password"
            >
            <button type="button" class="btn btn-icon auth-toggle-password" aria-label="Show password">
              <span class="btn-icon">👁️</span>
            </button>
          </div>

          <div class="form-group">
            <label class="form-label" for="signup-confirm-password">Confirm Password</label>
            <input
              type="password"
              id="signup-confirm-password"
              class="form-input"
              placeholder="Confirm your password"
              required
              minlength="8"
            >
          </div>

          <div class="form-group form-checkbox">
            <label class="form-label">
              <input type="checkbox" id="signup-newsletter" class="form-input">
              Subscribe to financial tips & insights
            </label>
          </div>

          <button type="submit" class="btn btn-accent btn-width-full">
            Create Account
          </button>

          <p class="auth-footer">
            Already have an account? <a href="#" class="auth-link" id="show-login">Sign In</a>
          </p>
        </form>

        <div class="auth-divider">
          <span>OR</span>
        </div>

        <button class="btn btn-outline btn-width-full auth-social-btn">
          <span class="btn-icon">🔐</span>
          Continue with Email (Magic Link)
        </button>

        <p class="auth-terms">
          By signing up, you agree to our <a href="#" class="auth-link">Terms of Service</a> and
          <a href="#" class="auth-link">Privacy Policy</a>.
        </p>
      </div>
    `;
  }

  function renderLoadingState() {
    return `
      <div class="loading-state">
        <div class="loader loader-lg"></div>
        <p class="loading-text">Loading your financial world...</p>
      </div>
    `;
  }

  function renderErrorState() {
    return `
      <div class="alert alert-error">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <h4 class="alert-title">Authentication Error</h4>
          <p class="alert-message">${escapeHtml(errorMessage)}</p>
        </div>
      </div>
    `;
  }

  function render() {
    if (!authContainer) return;

    if (window.RoastMoneyApp && window.RoastMoneyApp.state.isAuthenticated) {
      // User is authenticated, show empty state
      authContainer.innerHTML = '';
      return;
    }

    authContainer.innerHTML = renderForms();
    attachEventListeners();
  }

  function attachEventListeners() {
    // Tab switching
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');

    if (loginTab && signupTab) {
      loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
      });

      signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
      });
    }

    if (showSignupLink) {
      showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupTab.click();
      });
    }

    if (showLoginLink) {
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginTab.click();
      });
    }

    // Password toggle
    const togglePasswordButtons = document.querySelectorAll('.auth-toggle-password');
    togglePasswordButtons.forEach(button => {
      button.addEventListener('click', () => {
        const input = button.parentElement.querySelector('input[type="password"]');
        if (input) {
          const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
          input.setAttribute('type', type);
          button.innerHTML = type === 'password' ? '<span class="btn-icon">👁️</span>' : '<span class="btn-icon">👁️‍🗨️</span>';
        }
      });
    });

    // Form submissions
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLoginSubmit(e);
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSignupSubmit(e);
      });
    }
  }

  async function handleLoginSubmit(e) {
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // Validate form
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Show loading state
    isLoading = true;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loader loader-sm"></span> Signing in...';
    errorMessage = '';
    render();

    try {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      const { user, error } = await window.RoastMoneyAuth.signIn(email, password);

      if (error) throw error;

      // Success
      window.RoastMoneyApp.handleAuthSuccess();
    } catch (error) {
      console.error('Login failed:', error);
      errorMessage = error.message || 'Failed to sign in. Please check your credentials.';
      isLoading = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Sign In';
      render();
    }
  }

  async function handleSignupSubmit(e) {
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // Validate form
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Check password match
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
      errorMessage = 'Passwords do not match';
      isLoading = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Create Account';
      render();
      return;
    }

    // Show loading state
    isLoading = true;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loader loader-sm"></span> Creating account...';
    errorMessage = '';
    render();

    try {
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;

      const { user, error } = await window.RoastMoneyAuth.signUp(email, password, { name });

      if (error) throw error;

      // Success - sign in the user
      const { user: signedInUser, error: signInError } = await window.RoastMoneyAuth.signIn(email, password);
      if (signInError) throw signInError;

      window.RoastMoneyApp.handleAuthSuccess();
    } catch (error) {
      console.error('Signup failed:', error);
      errorMessage = error.message || 'Failed to create account. Please try again.';
      isLoading = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Create Account';
      render();
    }
  }

  // Public API
  return {
    init,
    render,
    renderForms,
    escapeHtml: (str) => String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;')
  };
})();

// Make AuthUI globally accessible
window.AuthUI = AuthUI;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  AuthUI.init();
});