/**
 * app.js
 * Entry point. Owns the central state object, wires up every interactive
 * section, and coordinates the roast + personality engines with the UI
 * renderers. Now integrated with Supabase for authentication and data persistence.
 * Enhanced for world-class 2026 fintech experience.
 */

const state = {
  transactions: [], // Will be populated from Supabase or localStorage
  selectedTransactionId: null,
  filters: { search: '', category: 'all', sort: 'newest', dateRange: 'month' },
  personality: null,
  roastScore: 0,
  achievements: [],
  wrappedIndex: 0,
  logoClicks: 0,
  heatmapSelectedDay: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  user: null,
  // Enhanced financial metrics
  financialMetrics: {
    netWorth: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    cashFlow: 0,
    spendingHealth: 0,
    budgetVariance: 0
  },
  // Enhanced UI states
  uiState: {
    activeSection: 'dashboard',
    showAddTransaction: false,
    showFilters: false,
    showSettings: false,
    currentTheme: 'dark'
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI components
  initNav();
  Motion.initScrollReveal();
  Motion.initMagnetic();
  initFinancialCharts();
  initTransactionListeners();

  // Check authentication status
  checkAuthStatus();

  // Listen for auth events
  window.addEventListener('auth:success', handleAuthSuccess);
  window.addEventListener('auth:signout', handleAuthSignout);
  window.addEventListener('auth:error', handleAuthError);

  window.addEventListener('load', () => {
    document.body.classList.add('site-loaded');
    document.body.classList.remove('is-loading');
  });

  // Handle resize for responsive charts
  window.addEventListener('resize', debounce(() => {
    updateFinancialCharts();
  }, 250));

  // Logo click Easter egg
  const logo = document.querySelector('.nav-logo');
  if (logo) {
    logo.addEventListener('click', handleLogoClick);
  }
});

async function checkAuthStatus() {
  state.isLoading = true;
  state.authError = null;
  renderAll(); // Show loading state

  try {
    const { data: { session }, error } = await window.RoastMoneyAuth.checkAuthSession();

    if (error) {
      throw error;
    }

    if (session) {
      // User is authenticated
      const userData = await window.RoastMoneyAuth.getCurrentUser();
      state.user = userData;
      state.isAuthenticated = true;

      // Create profile if missing
      await window.RoastMoneyAuth.createProfileIfMissing(userData);

      // Fetch transactions for this user
      await fetchUserTransactions();

      // Calculate financial metrics
      await calculateFinancialMetrics();

      // Update UI
      renderAll();
    } else {
      // Not authenticated
      state.isAuthenticated = false;
      state.user = null;
      state.transactions = loadDemoData(); // Fallback to demo data
      state.financialMetrics = calculateDemoMetrics();
      renderAll();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    state.authError = error.message;
    state.isAuthenticated = false;
    state.user = null;
    state.transactions = loadDemoData(); // Fallback to demo data
    state.financialMetrics = calculateDemoMetrics();
    renderAll();
  }
}

async function handleAuthSuccess() {
  try {
    const userData = await window.RoastMoneyAuth.getCurrentUser();
    state.user = userData;
    state.isAuthenticated = true;
    state.authError = null;

    // Create profile if missing
    await window.RoastMoneyAuth.createProfileIfMissing(userData);

    // Fetch transactions for this user
    await fetchUserTransactions();

    // Calculate financial metrics
    await calculateFinancialMetrics();

    // Update UI
    renderAll();
  } catch (error) {
    console.error('Auth success handler failed:', error);
    state.authError = 'Failed to load user data';
    renderAll();
  }
}

function handleAuthSignout() {
  state.isAuthenticated = false;
  state.user = null;
  state.transactions = loadDemoData(); // Fallback to demo data
  state.financialMetrics = calculateDemoMetrics();
  renderAll();
}

function handleAuthError(error) {
  state.authError = error;
  state.isLoading = false;
  renderAll();
}

async function fetchUserTransactions() {
  try {
    const { data, error } = await window.RoastMoneySupabase.getTransactions();

    if (error) {
      throw error;
    }

    state.transactions = data || [];
    await calculateFinancialMetrics();
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    // Fallback to demo data on error
    state.transactions = loadDemoData();
    state.financialMetrics = calculateDemoMetrics();
  }
}

async function calculateFinancialMetrics() {
  if (!state.transactions || state.transactions.length === 0) {
    state.financialMetrics = {
      netWorth: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      savingsRate: 0,
      cashFlow: 0,
      spendingHealth: 0,
      budgetVariance: 0
    };
    return;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Filter transactions for current month
  const monthlyTransactions = state.transactions.filter(tx => {
    const txDate = new Date(tx.timestamp || tx.date);
    return txDate >= startOfMonth && txDate <= now;
  });

  // Calculate monthly income and expenses
  const monthlyIncome = monthlyTransactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyExpenses = Math.abs(monthlyTransactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + tx.amount, 0));

  const cashFlow = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (cashFlow / monthlyIncome) * 100 : 0;

  // Calculate net worth (sum of all transactions)
  const netWorth = state.transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate spending health (0-100 score based on various factors)
  const spendingHealth = calculateSpendingHealth(state.transactions);

  // Calculate budget variance (simplified)
  const budgetVariance = calculateBudgetVariance(monthlyTransactions);

  state.financialMetrics = {
    netWorth,
    monthlyIncome,
    monthlyExpenses,
    savingsRate: Math.max(0, Math.min(100, savingsRate)),
    cashFlow,
    spendingHealth: Math.max(0, Math.min(100, spendingHealth)),
    budgetVariance
  };
}

function calculateSpendingHealth(transactions) {
  if (!transactions || transactions.length === 0) return 50;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.timestamp || tx.date);
    return txDate >= thirtyDaysAgo && txDate <= now;
  });

  if (recentTransactions.length === 0) return 50;

  // Factors for spending health:
  // 1. Frequency of transactions (too frequent = bad)
  // 2. Average transaction size (extremes = bad)
  // 3. Category diversity (good)
  // 4. Timing consistency (regular income/expenses = good)

  const transactionCount = recentTransactions.length;
  const avgAmount = Math.abs(recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) / transactionCount);

  // Normalize factors to 0-100 scale
  const frequencyScore = Math.max(0, 100 - (transactionCount / 10)); // Penalize >100 transactions/month
  const amountScore = Math.max(0, 100 - Math.abs(avgAmount - 500) / 10); // Ideal around ₹500
  const categoryScore = Math.min(100, (new Set(recentTransactions.map(tx => tx.category)).size * 10)); // More categories = better

  return Math.min(100, Math.max(0, (frequencyScore + amountScore + categoryScore) / 3));
}

function calculateBudgetVariance(transactions) {
  // Simplified budget variance calculation
  // In a real app, this would compare against user-set budgets
  if (!transactions || transactions.length === 0) return 0;

  const expenses = transactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Assume a baseline budget of ₹50,000/month for demo
  const baselineBudget = 50000;
  const variance = ((expenses - baselineBudget) / baselineBudget) * 100;

  return Math.max(-100, Math.min(100, variance)); // Clamp to -100% to +100%
}

function handleLogoClick() {
  state.logoClicks++;

  if (state.logoClicks >= 5) {
    // Trigger Easter egg after 5 clicks
    state.logoClicks = 0;
    triggerCelebration();
  }
}

function triggerCelebration() {
  // Create confetti effect
  const celebration = document.createElement('div');
  celebration.className = 'celebration';
  celebration.innerHTML = `
    <div class="celebration-content">
      <h2>🎉 Congratulations! 🎉</h2>
      <p>You've discovered the secret money dance!</p>
      <button class="btn btn-outline celebration-close">Close</button>
    </div>
  `;

  document.body.appendChild(celebration);

  // Add confetti
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDelay = Math.random() * 3 + 's';
    confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 80%, 50%)`;
    document.body.appendChild(confetti);
  }

  // Remove celebration on close or after 5 seconds
  const closeBtn = celebration.querySelector('.celebration-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      celebration.remove();
      document.querySelectorAll('.confetti').forEach(el => el.remove());
    });
  }

  setTimeout(() => {
    celebration.remove();
    document.querySelectorAll('.confetti').forEach(el => el.remove());
  }, 5000);
}

// Enhanced rendering functions
function showLoadingState() {
  document.body.classList.add('is-loading');
  const loader = document.querySelector('.page-loader');
  if (loader) {
    loader.style.display = 'grid';
    loader.style.opacity = '1';
    loader.style.visibility = 'visible';
    loader.style.pointerEvents = 'auto';
  }
}

function hideLoadingStates() {
  document.body.classList.remove('is-loading');
  const loader = document.querySelector('.page-loader');
  if (loader) {
    loader.style.display = 'none';
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
    loader.style.pointerEvents = 'none';
  }
}

function showAuthError() {
  const authContainer = document.getElementById('auth-container');
  if (authContainer && state.authError) {
    authContainer.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h2 class="auth-title">Authentication Error</h2>
          <p class="auth-subtitle">Something went wrong</p>
        </div>
        <div class="alert alert-error">
          <div class="alert-icon">⚠️</div>
          <div class="alert-content">
            <h4 class="alert-title">Error</h4>
            <p class="alert-message">${escapeHtml(state.authError)}</p>
          </div>
        </div>
        ${window.AuthUI ? window.AuthUI.renderForms() : ''}
      </div>
    `;
  }
}

function renderAll() {
  renderAuthUI();
  renderHeader();
  renderHero();
  renderDashboard();
  renderInsights();
  renderWrapped();
  renderHeatmap();
  renderFooter();

  // Handle loading states
  if (state.isLoading) {
    showLoadingState();
  } else if (state.authError) {
    showAuthError();
  } else {
    hideLoadingStates();
  }
}

function renderAuthUI() {
  const authContainer = document.getElementById('auth-container');
  if (!authContainer) return;

  // Show auth UI only when not authenticated and not loading
  if (!state.isAuthenticated && !state.isLoading) {
    authContainer.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h2 class="auth-title">Welcome to ROAST.MONEY</h2>
          <p class="auth-subtitle">Your money has opinions. Let's hear them.</p>
        </div>
        ${window.AuthUI ? window.AuthUI.renderForms() : ''}
      </div>
    `;
  } else {
    authContainer.innerHTML = '';
  }
}

function renderHeader() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  // Nav is already in HTML, just update active states
  const navLinks = nav.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const section = link.getAttribute('href').substring(1);
    link.classList.toggle('active', section === state.uiState.activeSection);
  });

  // Update auth toggle
  const authToggle = nav.querySelector('.nav-auth-toggle');
  if (authToggle) {
    authToggle.innerHTML = state.isAuthenticated ?
      `<span class="nav-auth-icon">👤</span>` :
      `<span class="nav-auth-icon">🔐</span>`;
    authToggle.title = state.isAuthenticated ? 'Account' : 'Sign In';
  }
}

function renderHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  // Update CTA based on auth state
  const ctaBtn = hero.querySelector('#hero-cta');
  const tourBtn = hero.querySelector('#hero-tour');

  if (ctaBtn && tourBtn) {
    if (state.isAuthenticated) {
      ctaBtn.textContent = 'New Transaction';
      ctaBtn.onclick = () => showAddTransactionModal();
      tourBtn.textContent = 'View Insights';
      tourBtn.onclick = () => scrollToSection('insights');
    } else {
      ctaBtn.textContent = 'Get Started';
      ctaBtn.onclick = () => {}; // Handled by auth UI
      tourBtn.textContent = 'Learn More';
      tourBtn.onclick = () => scrollToSection('features');
    }
  }

  // Update live receipt if we have transactions
  const receiptContainer = hero.querySelector('.hero-receipt');
  if (receiptContainer && state.transactions.length > 0) {
    // Show most recent transaction
    const recentTx = state.transactions[0];
    if (recentTx) {
      receiptContainer.innerHTML = UI.renderHeroReceipt(
        receiptContainer,
        recentTx,
        getRandomRoastSnippet(),
        getStatusLabel(recentTx.amount)
      );

      // Animate receipt update
      receiptContainer.classList.add('is-updating');
      setTimeout(() => {
        receiptContainer.classList.remove('is-updating');
      }, 300);
    }
  }
}

function renderDashboard() {
  // Health summary
  renderHealthSummary();

  // Charts
  renderFinancialCharts();

  // Recent transactions
  renderRecentTransactions();
}

function renderHealthSummary() {
  const netWorthEl = document.getElementById('health-net-worth');
  const netWorthChangeEl = document.getElementById('health-net-worth-change');
  const cashFlowEl = document.getElementById('health-cash-flow');
  const cashFlowChangeEl = document.getElementById('health-cash-flow-change');
  const spendingScoreEl = document.getElementById('health-spending-score');
  const meterFillEl = document.getElementById('health-meter-fill');
  const meterLabelEl = document.getElementById('health-meter-label');

  if (netWorthEl) netWorthEl.textContent = formatCurrency(state.financialMetrics.netWorth);
  if (netWorthChangeEl) netWorthChangeEl.textContent = formatChange(state.financialMetrics.netWorth, 'monthly');
  if (cashFlowEl) cashFlowEl.textContent = formatCurrency(state.financialMetrics.cashFlow);
  if (cashFlowChangeEl) cashFlowChangeEl.textContent = `${Math.abs(state.financialMetrics.cashFlow) > 0 ?
    state.financialMetrics.cashFlow >= 0 ? '+' : '' : ''}${formatCurrency(state.financialMetrics.cashFlow)} this month`;
  if (spendingScoreEl) spendingScoreEl.textContent = Math.round(state.financialMetrics.spendingHealth);
  if (meterFillEl) {
    meterFillEl.style.width = `${state.financialMetrics.spendingHealth}%`;
    // Update meter color based on score
    if (state.financialMetrics.spendingHealth >= 80) {
      meterFillEl.style.background = 'linear-gradient(90deg, var(--color-status-calm), var(--color-success))';
    } else if (state.financialMetrics.spendingHealth >= 60) {
      meterFillEl.style.background = 'linear-gradient(90deg, var(--color-status-concerning), var(--color-warning))';
    } else {
      meterFillEl.style.background = 'linear-gradient(90deg, var(--color-status-severe), var(--color-error))';
    }
  }
  if (meterLabelEl) {
    meterLabelEl.textContent = getSpendingHealthLabel(state.financialMetrics.spendingHealth);
  }
}

function renderFinancialCharts() {
  // This would integrate with a charting library like Chart.js or D3
  // For now, we'll create placeholder containers that can be enhanced
  const spendingChart = document.getElementById('chart-spending-overview');
  const incomeChart = document.getElementById('chart-income-expenses');
  const categoryChart = document.getElementById('chart-category-breakdown');

  if (spendingChart) spendingChart.innerHTML = createChartPlaceholder('Spending Trends', 'line');
  if (incomeChart) incomeChart.innerHTML = createChartPlaceholder('Income vs Expenses', 'bar');
  if (categoryChart) categoryChart.innerHTML = createChartPlaceholder('Category Breakdown', 'pie');
}

function createChartPlaceholder(title) {
  return `
    <div class="chart-placeholder">
      <div class="chart-icon">📊</div>
      <h4 class="chart-placeholder-title">${title}</h4>
      <p class="chart-placeholder-subtitle">Chart visualization loading...</p>
      <div class="chart-placeholder-bg"></div>
    </div>
  `;
}

function renderRecentTransactions() {
  const transactionsContainer = document.getElementById('transactions-recent');
  if (!transactionsContainer) return;

  // Show 3 most recent transactions
  const recentTx = state.transactions.slice(0, 3);

  if (recentTx.length === 0) {
    transactionsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">No transactions yet</h3>
        <p class="empty-state-description">Add your first transaction to see your money story unfold.</p>
        <button class="btn btn-accent empty-state-action" onclick="showAddTransactionModal()">Add Transaction</button>
      </div>
    `;
    return;
  }

  transactionsContainer.innerHTML = recentTx.map(tx => `
    <div class="transaction-item" data-id="${tx.id}">
      <div class="transaction-icon">
        ${getCategoryIcon(tx.category)}
      </div>
      <div class="transaction-details">
        <div class="transaction-merchant">${escapeHtml(tx.merchant || 'Unknown Merchant')}</div>
        <div class="transaction-meta">
          <span>${formatDate(tx.timestamp || tx.date)}</span>
          <span>${getCategoryLabel(tx.category)}</span>
        </div>
      </div>
      <div class="transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
        ${formatCurrency(Math.abs(tx.amount))}
      </div>
    </div>
  `).join('');

  // Add click listeners to transaction items
  transactionsContainer.querySelectorAll('.transaction-item').forEach(item => {
    item.addEventListener('click', () => {
      const txId = item.getAttribute('data-id');
      selectTransaction(txId);
    });
  });
}

function renderInsights() {
  // Roast
  const roastEl = document.getElementById('insight-roast');
  if (roastEl) {
    roastEl.innerHTML = state.roastScore > 0 ?
      `<p>${getRoastText(state.roastScore)}</p>` :
      `<p class="insight-placeholder">Your personalized roast will appear here after analyzing your spending habits.</p>`;
  }

  // Personality
  const personalityEl = document.getElementById('insight-personality');
  if (personalityEl) {
    personalityEl.innerHTML = state.personality ?
      `<p>${state.personality.description}</p>` :
      `<p class="insight-placeholder">Your money personality will be revealed after sufficient transaction data.</p>`;
  }

  // Forecast
  const forecastEl = document.getElementById('insight-forecast');
  if (forecastEl) {
    forecastEl.innerHTML = generateFinancialForecast();
  }

  // Achievements
  const achievementsEl = document.getElementById('insight-achievements');
  if (achievementsEl) {
    achievementsEl.innerHTML = renderAchievements();
  }
}

function renderWrapped() {
  const wrappedContent = document.getElementById('wrapped-content');
  if (!wrappedContent) return;

  // Simplified wrapped experience
  wrappedContent.innerHTML = `
    <div class="wrapped-preview">
      <h3>Your Financial Year in Review</h3>
      <p>Based on ${state.transactions.length} transactions, here's your money story:</p>
      <div class="wrapped-stats">
        <div class="wrapped-stat">
          <h4>Total Spent</h4>
          <p>${formatCurrency(Math.abs(state.transactions
            .filter(tx => tx.amount < 0)
            .reduce((sum, tx) => sum + tx.amount, 0)))}</p>
        </div>
        <div class="wrapped-stat">
          <h4>Total Earned</h4>
          <p>${formatCurrency(state.transactions
            .filter(tx => tx.amount > 0)
            .reduce((sum, tx) => sum + tx.amount, 0))}</p>
        </div>
        <div class="wrapped-stat">
          <h4>Favorite Category</h4>
          <p>${getTopCategory()}</p>
        </div>
      </div>
    </div>
  `;
}

function renderHeatmap() {
  const heatmapContainer = document.getElementById('heatmap-container');
  if (!heatmapContainer) return;

  // Create a simple calendar heatmap
  heatmapContainer.innerHTML = createCalendarHeatmap();
}

function createCalendarHeatmap() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group transactions by day
  const dailyTotals = {};
  state.transactions.forEach(tx => {
    const txDate = new Date(tx.timestamp || tx.date);
    const day = txDate.getDate();
    if (!dailyTotals[day]) dailyTotals[day] = 0;
    dailyTotals[day] += tx.amount;
  });

  // Find max for normalization
  const amounts = Object.values(dailyTotals).filter(amount => amount !== 0);
  const maxAmount = amounts.length > 0 ? Math.max(...amounts.map(Math.abs)) : 1;

  let html = '<div class="heatmap-grid">';

  // Add day headers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(day => {
    html += `<div class="heatmap-day-header">${day}</div>`;
  });

  // Add calendar days
  // First, add blank days for the start of the month
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="heatmap-day empty"></div>`;
  }

  // Add each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const amount = dailyTotals[day] || 0;
    const intensity = amount !== 0 ? Math.min(100, Math.max(0, (Math.abs(amount) / maxAmount) * 100)) : 0;
    const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

    html += `
      <div
        class="heatmap-day ${isToday ? 'today' : ''}"
        data-day="${day}"
        data-amount="${amount}"
        style="background-color: var(--color-bg-surface);"
      >
        <div class="heatmap-day-number">${day}</div>
        ${amount !== 0 ?
          `<div class="heatmap-day-intensity" style="height: ${intensity}%; background: linear-gradient(to top, var(--color-bg-surface), ${getHeatmapColor(amount)});"></div>` :
          ''
        }
        ${amount !== 0 ?
          `<div class="heatmap-day-tooltip">${formatCurrency(Math.abs(amount))}</div>` :
          ''
        }
      </div>
    `;
  }

  html += '</div>';

  // Add legend
  html += `
    <div class="heatmap-legend">
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-color" style="background: var(--color-status-calm);"></div>
        <span>Low Spending</span>
      </div>
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-color" style="background: var(--color-status-concerning);"></span>
        <span>Moderate Spending</span>
      </div>
      <div class="heatmap-legend-item">
        <div class="heatmap-legend-color" style="background: var(--color-status-severe);"></span>
        <span>High Spending</span>
      </div>
    </div>
  `;

  return html;
}

function getHeatmapColor(amount) {
  if (amount >= 0) return 'var(--color-status-calm)'; // Income/green
  const absAmount = Math.abs(amount);
  if (absAmount < 1000) return 'var(--color-status-concerning)'; // Low spending
  if (absAmount < 5000) return 'var(--color-status-severe)'; // Medium spending
  return 'var(--color-error)'; // High spending
}

function renderAchievements() {
  if (!state.achievements || state.achievements.length === 0) {
    return `
      <div class="achievements-placeholder">
        <h4>No achievements yet</h4>
        <p>Keep using ROAST.MONEY to unlock financial milestones!</p>
      </div>
    `;
  }

  return state.achievements.map(achievement => `
    <div class="achievement-item">
      <div class="achievement-icon">${achievement.icon || '🏆'}</div>
      <div class="achievement-content">
        <h4>${achievement.title}</h4>
        <p>${achievement.description}</p>
        ${achievement.date ? `<small class="achievement-date">${formatDate(achievement.date)}</small>` : ''}
      </div>
    </div>
  `).join('');
}

function renderFooter() {
  // Footer is mostly static, but we could add dynamic elements
  const footerYear = document.querySelector('.footer-copyright');
  if (footerYear) {
    footerYear.textContent = `© ${new Date().getFullYear()} ROAST.MONEY. All rights reserved.`;
  }
}

// State management functions
function selectTransaction(txId) {
  state.selectedTransactionId = txId;
  // In a full implementation, this would open a transaction detail modal
  showTransactionDetail(txId);
}

function showTransactionDetail(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  // Create and show modal
  const modal = document.getElementById('transaction-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-backdrop" aria-hidden="true"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(tx.merchant || 'Transaction Details')}</h3>
        <button class="btn btn-icon modal-close" aria-label="Close">
          <span class="btn-icon">×</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="transaction-detail">
          <div class="detail-row">
            <span class="detail-label">Amount</span>
            <span class="detail-value transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
              ${formatCurrency(Math.abs(tx.amount))}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">${formatDate(tx.timestamp || tx.date)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Category</span>
            <span class="detail-value">${getCategoryLabel(tx.category)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Notes</span>
            <span class="detail-value">${escapeHtml(tx.notes || 'No notes')}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('transaction-modal')">Close</button>
          ${state.isAuthenticated ?
            `<button class="btn btn-accent" onclick="editTransaction('${tx.id}')">Edit</button>` :
            ''
          }
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'block';

  // Add close listener
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal('transaction-modal'));
  }

  // Close on backdrop click
  const backdrop = modal.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => closeModal('transaction-modal'));
  }
}

function showAddTransactionModal() {
  const modal = document.getElementById('transaction-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-backdrop" aria-hidden="true"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Add New Transaction</h3>
        <button class="btn btn-icon modal-close" aria-label="Close">
          <span class="btn-icon">×</span>
        </button>
      </div>
      <div class="modal-body">
        <form id="transaction-form">
          <div class="form-group">
            <label class="form-label" for="tx-amount">Amount (₹)</label>
            <input
              type="number"
              id="tx-amount"
              class="form-input"
              placeholder="Enter amount"
              required
              min="0.01"
              step="0.01"
            >
          </div>
          <div class="form-group">
            <label class="form-label" for="tx-merchant">Merchant</label>
            <input
              type="text"
              id="tx-merchant"
              class="form-input"
              placeholder="Where did you spend/receive money?"
              required
            >
          </div>
          <div class="form-group">
            <label class="form-label" for="tx-category">Category</label>
            <select id="tx-category" class="form-select" required>
              <option value="">Select a category</option>
              <option value="food_dining">Food & Dining</option>
              <option value="transportation">Transportation</option>
              <option value="shopping">Shopping</option>
              <option value="entertainment">Entertainment</option>
              <option value="bills_utilities">Bills & Utilities</option>
              <option value="healthcare">Healthcare</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="tx-notes">Notes (optional)</label>
            <textarea
              id="tx-notes"
              class="form-textarea"
              placeholder="Add any additional details..."
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="tx-date">Date</label>
            <input
              type="date"
              id="tx-date"
              class="form-input"
              value="${new Date().toISOString().split('T')[0]}"
              required
            >
          </div>
          <div class="form-group form-checkbox">
            <label class="form-label">
              <input type="checkbox" id="tx-is-income" class="form-input">
              This is income (not an expense)
            </label>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('transaction-modal')">Cancel</button>
        <button class="btn btn-accent" id="tx-submit-btn">Add Transaction</button>
      </div>
    </div>
  `;

  modal.style.display = 'block';

  // Add form submit listener
  const form = modal.querySelector('#transaction-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleAddTransactionSubmit(form);
    });
  }

  // Add close listener
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal('transaction-modal'));
  }

  // Close on backdrop click
  const backdrop = modal.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => closeModal('transaction-modal'));
  }

  // Focus first input
  setTimeout(() => {
    const firstInput = modal.querySelector('.form-input');
    if (firstInput) firstInput.focus();
  }, 100);
}

async function handleAddTransactionSubmit(form) {
  const submitBtn = form.closest('.modal-content').querySelector('#tx-submit-btn');
  if (!submitBtn) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loader loader-sm"></span> Adding...';

  try {
    const amount = parseFloat(form.elements['tx-amount'].value);
    const isIncome = form.elements['tx-is-income'].checked;
    const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchant: form.elements['tx-merchant'].value.trim(),
      amount: finalAmount,
      category: form.elements['tx-category'].value,
      notes: form.elements['tx-notes'].value.trim(),
      timestamp: new Date(form.elements['tx-date'].value).toISOString(),
      user_id: state.user?.id || null
    };

    let savedTx;
    if (state.isAuthenticated) {
      const { data, error } = await window.RoastMoneySupabase.saveTransaction(newTx);
      if (error) throw error;
      savedTx = data;
    } else {
      // Save to localStorage
      const demoTx = loadDemoData();
      demoTx.unshift(savedTx);
      saveDemoData(demoTx);
      savedTx = newTx;
    }

    // Update state
    if (state.isAuthenticated) {
      await fetchUserTransactions(); // Refresh from Supabase
    } else {
      state.transactions = loadDemoData(); // Refresh from localStorage
    }

    // Recalculate metrics
    await calculateFinancialMetrics();

    // Update UI
    renderAll();

    // Show success toast
    showToast('Transaction added successfully!', 'success');

    // Close modal
    closeModal('transaction-modal');
  } catch (error) {
    console.error('Failed to add transaction:', error);
    showToast('Failed to add transaction. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Transaction';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.innerHTML = ''; // Clear content
  }
}

function showToast(message, type = 'info') {
  // Remove any existing toasts
  document.querySelectorAll('.toast').forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" aria-label="Close">×</button>
  `;

  document.body.appendChild(toast);

  // Add close listener
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
  }

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 5000);
}

function getToastIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || 'ℹ️';
}

// Helper functions
function formatCurrency(amount) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getCategoryIcon(category) {
  const icons = {
    'food_dining': '🍽️',
    'transportation': '🚗',
    'shopping': '🛍️',
    'entertainment': '🎬',
    'bills_utilities': '💡',
    'healthcare': '🏥',
    'income': '💰',
    'transfer': '🔄',
    'other': '📦'
  };
  return icons[category] || '📄';
}

function getCategoryLabel(category) {
  const labels = {
    'food_dining': 'Food & Dining',
    'transportation': 'Transportation',
    'shopping': 'Shopping',
    'entertainment': 'Entertainment',
    'bills_utilities': 'Bills & Utilities',
    'healthcare': 'Healthcare',
    'income': 'Income',
    'transfer': 'Transfer',
    'other': 'Other'
  };
  return labels[category] || category;
}

function getRandomRoastSnippet() {
  const snippets = [
    "Your spending habits need intervention.",
    "Congratulations on funding someone else's lifestyle.",
    "Your wallet is crying silently.",
    "This isn't spending, it's financial self-sabotage.",
    "Your bank account has trust issues.",
    "You treat money like it's renewable.",
    "Your spending pattern resembles a drunken sailor.",
    "Financial advisor? More like financial enabler.",
    "Your coffee habit could fund a small nation.",
    "You're not broke, you're just poorly organized."
  ];
  return snippets[Math.floor(Math.random() * snippets.length)];
}

function getRoastText(score) {
  if (score >= 90) return "Your spending habits are financially reckless. Seek help.";
  if (score >= 80) return "You spend like there's no tomorrow - and honestly, there might not be if you keep this up.";
  if (score >= 70) return "Your spending patterns show concerning levels of financial impulsivity.";
  if (score >= 60) return "You're spending more than you should be. Consider a budget.";
  if (score >= 50) return "Your spending is average - which means there's plenty of room for improvement.";
  if (score >= 40) return "You're doing okay, but you could be much better with your money.";
  if (score >= 30) return "You're being reasonably responsible with your finances.";
  if (score >= 20) return "You're quite good at managing your money. Keep it up!";
  if (score >= 10) return "You're excellent with money. Most people wish they had your discipline.";
  return "You're a financial wizard. Teach us your ways.";
}

function getStatusLabel(amount) {
  if (amount > 0) return 'INCOME DETECTED';
  if (amount < 0) return 'SPENDING DETECTED';
  return 'NO ACTIVITY';
}

function getSpendingHealthLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

function getTopCategory() {
  if (!state.transactions || state.transactions.length === 0) return 'N/A';

  const categoryTotals = {};
  state.transactions.forEach(tx => {
    if (!categoryTotals[tx.category]) categoryTotals[tx.category] = 0;
    categoryTotals[tx.category] += Math.abs(tx.amount);
  });

  return Object.keys(categoryTotals).reduce((a, b) =>
    categoryTotals[a] > categoryTotals[b] ? a : b
  );
}

function generateFinancialForecast() {
  if (!state.transactions || state.transactions.length < 5) {
    return `
      <p class="forecast-placeholder">
        Keep tracking your transactions to see personalized financial forecasts.
      </p>
    `;
  }

  // Simple forecast based on recent trends
  const recentTx = state.transactions.slice(0, 10);
  const avgDailySpend = Math.abs(
    recentTx
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0)
  ) / Math.min(recentTx.length, 10);

  const projectedMonthly = avgDailySpend * 30;

  return `
    <div class="forecast-content">
      <div class="forecast-item">
        <div class="forecast-label">Projected Monthly Spend</div>
        <div class="forecast-value">${formatCurrency(projectedMonthly)}</div>
      </div>
      <div class="forecast-item">
        <div class="forecast-label">Based on Last 10 Transactions</div>
        <div class="forecast-value">Avg: ${formatCurrency(avgDailySpend)}/day</div>
      </div>
    </div>
  `;
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function loadDemoData() {
  try {
    const saved = localStorage.getItem('roastmoney_demo_transactions');
    return saved ? JSON.parse(saved) : window.demoData || [];
  } catch (e) {
    return window.demoData || [];
  }
}

function saveDemoData(data) {
  try {
    localStorage.setItem('roastmoney_demo_transactions', JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save demo data to localStorage');
  }
}

function calculateDemoMetrics() {
  const demoTx = loadDemoData();
  if (!demoTx || demoTx.length === 0) {
    return {
      netWorth: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      savingsRate: 0,
      cashFlow: 0,
      spendingHealth: 50,
      budgetVariance: 0
    };
  }

  // Same calculation as real metrics but on demo data
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyTransactions = demoTx.filter(tx => {
    const txDate = new Date(tx.timestamp || tx.date);
    return txDate >= startOfMonth && txDate <= now;
  });

  const monthlyIncome = monthlyTransactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyExpenses = Math.abs(monthlyTransactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + tx.amount, 0));

  const cashFlow = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (cashFlow / monthlyIncome) * 100 : 0;
  const netWorth = demoTx.reduce((sum, tx) => sum + tx.amount, 0);
  const spendingHealth = calculateSpendingHealth(demoTx);
  const budgetVariance = calculateBudgetVariance(monthlyTransactions);

  return {
    netWorth,
    monthlyIncome,
    monthlyExpenses,
    savingsRate: Math.max(0, Math.min(100, savingsRate)),
    cashFlow,
    spendingHealth: Math.max(0, Math.min(100, spendingHealth)),
    budgetVariance
  };
}

function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    // Update UI state
    state.uiState.activeSection = sectionId;
    // Update nav highlighting
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const targetId = href.substring(1);
        link.classList.toggle('active', targetId === sectionId);
      }
    });
  }
}

// Initialize financial charts (placeholder for actual charting library)
function initFinancialCharts() {
  // This would initialize actual charts with Chart.js, D3, or similar
  // For now, we'll just set up the containers
  console.log('Financial charts initialized (placeholder)');
}

function updateFinancialCharts() {
  // This would update actual charts with new data
  console.log('Financial charts updated');
}

function initTransactionListeners() {
  // Set up any global transaction-related listeners
  console.log('Transaction listeners initialized');
}

// Export for use in other modules
window.RoastMoneyApp = {
  state,
  renderAll,
  checkAuthStatus,
  handleAuthSuccess,
  handleAuthSignout,
  selectTransaction,
  showAddTransactionModal,
  scrollToSection,
  showToast
};