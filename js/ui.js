/**
 * ui.js
 * Pure(-ish) rendering functions. Each function takes data and writes DOM.
 * State mutation and event wiring live in app.js — this file only draws.
 * Enhanced for world-class 2026 fintech design system.
 */

const UI = (() => {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  function formatCurrency(amount) {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function statusClass(intensity) {
    if (intensity <= 20) return 'status-calm';
    if (intensity <= 40) return 'status-mild';
    if (intensity <= 60) return 'status-questionable';
    if (intensity <= 80) return 'status-concerning';
    return 'status-severe';
  }

  // ---- Hero live receipt ---------------------------------------------

  function renderHeroReceipt(el, tx, roastText, statusLabel) {
    el.classList.add('is-updating');
    setTimeout(() => {
      el.innerHTML = `
        <div class="receipt-content">
          <p class="receipt-eyebrow">${statusLabel}</p>
          <div class="receipt-main">
            <div class="receipt-info">
              <p class="receipt-merchant">${escapeHtml(tx.merchant || 'Unknown Merchant')}</p>
              <p class="receipt-category">${getCategoryLabel(tx.category)}</p>
            </div>
            <p class="receipt-amount">${formatCurrency(Math.abs(tx.amount))}</p>
          </div>
          <p class="receipt-time">${formatTime(tx.timestamp || tx.date)}</p>
          <div class="receipt-divider" aria-hidden="true"></div>
          <p class="receipt-status-label">ROAST STATUS</p>
          <p class="receipt-roast-text">${escapeHtml(roastText)}</p>
        </div>
      `;
      el.classList.remove('is-updating');
    }, 300);
  }

  // ---- Financial Metrics Cards ---------------------------------------

  function renderHealthCard(el, label, value, change, isPositive = true) {
    el.innerHTML = `
      <h3 class="health-label">${label}</h3>
      <div class="health-value">${value}</div>
      <p class="health-change ${isPositive ? 'positive' : 'negative'}">
        ${change}
      </p>
    `;
  }

  function renderHealthMeter(el, score, label) {
    el.innerHTML = `
      <div class="health-meter">
        <div class="health-meter-fill" style="width: ${score}%"></div>
      </div>
      <p class="health-meter-label">${label}</p>
    `;

    // Set meter color based on score
    const fill = el.querySelector('.health-meter-fill');
    if (fill) {
      if (score >= 80) {
        fill.style.background = 'linear-gradient(90deg, var(--color-status-calm), var(--color-success))';
      } else if (score >= 60) {
        fill.style.background = 'linear-gradient(90deg, var(--color-status-concerning), var(--color-warning))';
      } else {
        fill.style.background = 'linear-gradient(90deg, var(--color-status-severe), var(--color-error))';
      }
    }
  }

  // ---- Charts --------------------------------------------------------

  function renderChartPlaceholder(el, title, type = 'line') {
    el.innerHTML = `
      <div class="chart-placeholder">
        <div class="chart-icon">📊</div>
        <h4 class="chart-placeholder-title">${title}</h4>
        <p class="chart-placeholder-subtitle">Chart visualization loading...</p>
        <div class="chart-placeholder-bg"></div>
      </div>
    `;
  }

  // ---- Transactions --------------------------------------------------

  function renderTransactionItem(el, tx) {
    const isIncome = tx.amount >= 0;
    el.innerHTML = `
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
        <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
          ${formatCurrency(Math.abs(tx.amount))}
        </div>
      </div>
    `;
  }

  function renderEmptyTransactions(el) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">No transactions yet</h3>
        <p class="empty-state-description">Add your first transaction to see your money story unfold.</p>
        <button class="btn btn-accent empty-state-action" onclick="window.RoastMoneyApp.showAddTransactionModal()">Add Transaction</button>
      </div>
    `;
  }

  // ---- Insights ------------------------------------------------------

  function renderRoastInsight(el, score) {
    el.innerHTML = score > 0 ?
      `<p>${getRoastText(score)}</p>` :
      `<p class="insight-placeholder">Your personalized roast will appear here after analyzing your spending habits.</p>`;
  }

  function renderPersonalityInsight(el, personality) {
    el.innerHTML = personality ?
      `<p>${personality.description}</p>` :
      `<p class="insight-placeholder">Your money personality will be revealed after sufficient transaction data.</p>`;
  }

  function renderForecastInsight(el, transactions) {
    el.innerHTML = generateFinancialForecast(transactions);
  }

  function renderAchievementsInsight(el, achievements) {
    if (!achievements || achievements.length === 0) {
      el.innerHTML = `
        <div class="achievements-placeholder">
          <h4>No achievements yet</h4>
          <p>Keep using ROAST.MONEY to unlock financial milestones!</p>
        </div>
      `;
      return;
    }

    el.innerHTML = achievements.map(achievement => `
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

  // ---- Wrapped -------------------------------------------------------

  function renderWrappedPreview(el, transactions) {
    if (!transactions || transactions.length === 0) {
      el.innerHTML = `
        <div class="wrapped-preview">
          <h3>Your Financial Year in Review</h3>
          <p>Add some transactions to see your money story unfold.</p>
        </div>
      `;
      return;
    }

    const totalSpent = Math.abs(transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0));

    const totalEarned = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const favoriteCategory = getTopCategory(transactions);

    el.innerHTML = `
      <div class="wrapped-preview">
        <h3>Your Financial Year in Review</h3>
        <p>Based on ${transactions.length} transactions, here's your money story:</p>
        <div class="wrapped-stats">
          <div class="wrapped-stat">
            <h4>Total Spent</h4>
            <p>${formatCurrency(totalSpent)}</p>
          </div>
          <div class="wrapped-stat">
            <h4>Total Earned</h4>
            <p>${formatCurrency(totalEarned)}</p>
          </div>
          <div class="wrapped-stat">
            <h4>Favorite Category</h4>
            <p>${favoriteCategory}</p>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Heatmap -------------------------------------------------------

  function renderCalendarHeatmap(el, transactions) {
    if (!transactions || transactions.length === 0) {
      el.innerHTML = `
        <div class="heatmap-empty">
          <div class="heatmap-empty-icon">📅</div>
          <p class="heatmap-empty-title">No transaction data for calendar view</p>
          <p class="heatmap-empty-description">Add transactions to see your spending patterns over time.</p>
        </div>
      `;
      return;
    }

    el.innerHTML = createCalendarHeatmap(transactions);
  }

  // ---- Modals --------------------------------------------------------

  function renderTransactionModal(el, tx = null) {
    if (tx) {
      // Edit/View mode
      el.innerHTML = `
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
              <button class="btn btn-outline" onclick="window.RoastMoneyApp.closeModal('transaction-modal')">Close</button>
              ${window.RoastMoneyApp.state.isAuthenticated ?
                `<button class="btn btn-accent" onclick="window.RoastMoneyApp.editTransaction('${tx.id}')">Edit</button>` :
                ''
              }
            </div>
          </div>
        </div>
      `;
    } else {
      // Add mode
      el.innerHTML = `
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
            <button class="btn btn-outline" onclick="window.RoastMoneyApp.closeModal('transaction-modal')">Cancel</button>
            <button class="btn btn-accent" id="tx-submit-btn">Add Transaction</button>
          </div>
        </div>
      `;
    }
  }

  // ---- Helper Functions ----------------------------------------------

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

  function getTopCategory(transactions) {
    if (!transactions || transactions.length === 0) return 'N/A';

    const categoryTotals = {};
    transactions.forEach(tx => {
      if (!categoryTotals[tx.category]) categoryTotals[tx.category] = 0;
      categoryTotals[tx.category] += Math.abs(tx.amount);
    });

    return Object.keys(categoryTotals).reduce((a, b) =>
      categoryTotals[a] > categoryTotals[b] ? a : b
    );
  }

  function generateFinancialForecast(transactions) {
    if (!transactions || transactions.length < 5) {
      return `
        <p class="forecast-placeholder">
          Keep tracking your transactions to see personalized financial forecasts.
        </p>
      `;
    }

    // Simple forecast based on recent trends
    const recentTx = transactions.slice(0, 10);
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

  function createCalendarHeatmap(transactions) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Group transactions by day
    const dailyTotals = {};
    transactions.forEach(tx => {
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
          <div class="heatmap-legend-color" style="background: var(--color-status-concerning);"></div>
          <span>Moderate Spending</span>
        </div>
        <div class="heatmap-legend-item">
          <div class="heatmap-legend-color" style="background: var(--color-status-severe);"></div>
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

  // Public API
  return {
    escapeHtml,
    formatCurrency,
    formatTime,
    formatDate,
    statusClass,
    renderHeroReceipt,
    renderHealthCard,
    renderHealthMeter,
    renderChartPlaceholder,
    renderTransactionItem,
    renderEmptyTransactions,
    renderRoastInsight,
    renderPersonalityInsight,
    renderForecastInsight,
    renderAchievementsInsight,
    renderWrappedPreview,
    renderCalendarHeatmap,
    renderTransactionModal,
    getCategoryIcon,
    getCategoryLabel,
    getRandomRoastSnippet,
    getRoastText,
    getStatusLabel,
    getSpendingHealthLabel,
    getTopCategory,
    generateFinancialForecast,
    createCalendarHeatmap,
    getHeatmapColor
  };
})();

// Make UI globally accessible
window.UI = UI;