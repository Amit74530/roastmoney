/**
 * app.js
 * Entry point. Owns the central state object, wires up every interactive
 * section, and coordinates the roast + personality engines with the UI
 * renderers. Structured so a future backend can replace `state.transactions`
 * with fetched data without touching the render layer.
 */

const state = {
  transactions: [...DEMO_TRANSACTIONS],
  selectedTransactionId: null,
  filters: { search: '', category: 'all', sort: 'newest' },
  personality: null,
  roastScore: 0,
  achievements: [],
  wrappedIndex: 0,
  logoClicks: 0,
  heatmapSelectedDay: null,
};

document.addEventListener('DOMContentLoaded', () => {
  ensureRoasts();
  initNav();
  Motion.initScrollReveal();
  Motion.initMagnetic();
  initHeroReceipt();
  initHowItWorks();
  initTransactionLab();
  initTransactionHistory();
  initHeatmap();
  initFlow();
  initPersonality();
  initAchievements();
  initWrapped();
  initShareCard();
  initEasterEggs();
  recomputeDerived();
  renderAll();

  window.addEventListener('load', () => {
    document.body.classList.add('site-loaded');
    document.body.classList.remove('is-loading');
  });
});

// ---- Derived state --------------------------------------------------

function ensureRoasts() {
  state.transactions.forEach((tx, i) => {
    if (tx.roast) return;
    const history = state.transactions.slice(0, i);
    const roast = RoastEngine.generate(tx, { history });
    tx.roast = roast.text;
    tx.intensity = roast.intensity;
  });
}

function recomputeDerived() {
  state.personality = PersonalityEngine.computePersonality(state.transactions);
  state.roastScore = PersonalityEngine.computeRoastScore(state.transactions);
  state.achievements = PersonalityEngine.computeAchievements(state.transactions);
}

function renderAll() {
  renderHistorySection();
  renderPersonalitySection();
  renderHeatmapSection();
  renderFlowSection();
  renderAchievementsSection();
}

// ---- Navigation --------------------------------------------------------

function initNav() {
  const nav = document.querySelector('.nav');
  Motion.initNavScrollState(nav);

  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

// ---- Hero live receipt --------------------------------------------------

function initHeroReceipt() {
  const receiptEl = document.querySelector('.hero-receipt');
  const moodDot = document.querySelector('.wallet-mood-dot');
  const moodLabel = document.querySelector('.wallet-mood-label');
  if (!receiptEl) return;

  let tickerIndex = 0;

  function showNext() {
    const raw = HERO_TICKER_TRANSACTIONS[tickerIndex % HERO_TICKER_TRANSACTIONS.length];
    tickerIndex += 1;
    const fakeTx = {
      merchant: raw.merchant,
      category: raw.category,
      amount: raw.amount,
      timestamp: new Date().toISOString(),
    };
    const roast = RoastEngine.generate(fakeTx, { history: state.transactions });
    UI.renderHeroReceipt(receiptEl, { ...raw }, roast.text, RoastEngine.statusLabel(roast.intensity));

    const mood = UI.walletMoodFromIntensity(roast.intensity);
    if (moodDot) moodDot.dataset.mood = mood.dot;
    if (moodLabel) moodLabel.textContent = mood.label;
  }

  showNext();
  setInterval(showNext, 4200);
}

// ---- How it works: scroll-driven sequence -------------------------------

function initHowItWorks() {
  const section = document.querySelector('.how-it-works');
  if (!section) return;
  const steps = section.querySelectorAll('.how-step');
  Motion.initScrollSequence(section, steps, (index) => UI.setActiveStep(steps, index));
}

// ---- Transaction Lab -----------------------------------------------------

function initTransactionLab() {
  const form = document.querySelector('.lab-form');
  const loadingEl = document.querySelector('.lab-loading');
  const resultEl = document.querySelector('.lab-result');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const merchant = String(formData.get('merchant') || '').trim();
    const amount = Number(formData.get('amount'));
    const category = String(formData.get('category') || 'Other');
    const time = String(formData.get('time') || '');

    if (!merchant || Number.isNaN(amount)) {
      showLabError('Something went wrong. Your money is still gone though.');
      return;
    }

    const timestamp = buildTimestampFromTimeInput(time);
    const tx = {
      id: `TX-${Date.now()}`,
      merchant,
      category,
      amount,
      timestamp,
      roast: null,
      intensity: null,
    };

    resultEl.classList.remove('is-visible');
    form.querySelector('button[type="submit"]').disabled = true;

    UI.runLoadingSequence(loadingEl, () => {
      const easterEgg = checkTransactionEasterEggs(amount);
      const roastData = easterEgg || RoastEngine.generate(tx, { history: state.transactions });
      tx.roast = roastData.text;
      tx.intensity = roastData.intensity ?? PersonalityEngine.computeRoastScore([tx]);

      state.transactions.unshift(tx);
      recomputeDerived();
      renderAll();

      resultEl.innerHTML = `
        <p class="lab-result-status">${RoastEngine.statusLabel(tx.intensity)}</p>
        <p class="lab-result-roast">"${UI.escapeHtml(tx.roast)}"</p>
      `;
      resultEl.classList.add('is-visible');
      form.querySelector('button[type="submit"]').disabled = false;
      form.reset();

      document.getElementById('history').scrollIntoView({ behavior: Motion.reduced() ? 'auto' : 'smooth', block: 'nearest' });
    });
  });
}

function buildTimestampFromTimeInput(timeStr) {
  const now = new Date(2026, 7, 15); // anchor demo purchases within August 2026
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    now.setHours(h || 0, m || 0, 0, 0);
  }
  return now.toISOString();
}

function showLabError(message) {
  const resultEl = document.querySelector('.lab-result');
  resultEl.innerHTML = `<p class="lab-error">${UI.escapeHtml(message)}</p>`;
  resultEl.classList.add('is-visible');
}

/** Returns a custom roast object for special-cased amounts, or null. */
function checkTransactionEasterEggs(amount) {
  if (amount === 69) {
    return { text: 'Nice.', intensity: 42 };
  }
  if (amount === 0) {
    return { text: 'Impressive. Finally, financial discipline.', intensity: 1 };
  }
  if (amount > 50000) {
    return { text: 'Sir/Ma\'am, this is no longer a purchase.', intensity: 100 };
  }
  return null;
}

// ---- Transaction history: render + filter/sort/select/delete -----------

function initTransactionHistory() {
  const searchInput = document.querySelector('.history-search');
  const categorySelect = document.querySelector('.history-category');
  const sortSelect = document.querySelector('.history-sort');
  const list = document.querySelector('.tx-list');
  const detailPanel = document.querySelector('.tx-detail');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.filters.search = searchInput.value.toLowerCase();
      renderHistorySection();
    });
  }
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      state.filters.category = categorySelect.value;
      renderHistorySection();
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.filters.sort = sortSelect.value;
      renderHistorySection();
    });
  }

  if (list) {
    list.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('[data-action="delete-tx"]');
      if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.txId;
        state.transactions = state.transactions.filter((t) => t.id !== id);
        if (state.selectedTransactionId === id) state.selectedTransactionId = null;
        recomputeDerived();
        renderAll();
        return;
      }
      const focusBtn = e.target.closest('[data-action="focus-lab"]');
      if (focusBtn) {
        document.querySelector('.lab-form input[name="merchant"]')?.focus();
        return;
      }
      const row = e.target.closest('.tx-row');
      if (row) {
        state.selectedTransactionId = row.dataset.txId;
        renderHistorySection();
      }
    });
    list.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tx-row')) {
        e.preventDefault();
        state.selectedTransactionId = e.target.dataset.txId;
        renderHistorySection();
      }
    });
  }

  if (detailPanel) {
    detailPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="reroast"]');
      if (!btn) return;
      const tx = state.transactions.find((t) => t.id === btn.dataset.txId);
      if (!tx) return;
      const history = state.transactions.filter((t) => t.id !== tx.id);
      const alt = RoastEngine.reRoast(tx, { history });
      tx.roast = alt.text;
      tx.intensity = alt.intensity;
      renderHistorySection();
    });
  }
}

function getFilteredTransactions() {
  let list = [...state.transactions];
  const { search, category, sort } = state.filters;

  if (search) {
    list = list.filter((t) => t.merchant.toLowerCase().includes(search));
  }
  if (category !== 'all') {
    list = list.filter((t) => t.category === category);
  }

  switch (sort) {
    case 'oldest':
      list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      break;
    case 'highest':
      list.sort((a, b) => b.amount - a.amount);
      break;
    case 'lowest':
      list.sort((a, b) => a.amount - b.amount);
      break;
    default:
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  return list;
}

function renderHistorySection() {
  const list = document.querySelector('.tx-list');
  const detailPanel = document.querySelector('.tx-detail');
  const countEl = document.querySelector('.history-count');
  if (!list) return;

  const filtered = getFilteredTransactions();
  UI.renderTransactionList(list, filtered);
  if (countEl) countEl.textContent = `${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`;

  const selected = state.transactions.find((t) => t.id === state.selectedTransactionId) || null;
  if (detailPanel) UI.renderTransactionDetail(detailPanel, selected);
}

// ---- Heatmap -------------------------------------------------------------

function initHeatmap() {
  const grid = document.querySelector('.heatmap-grid');
  const tooltip = document.querySelector('.heatmap-tooltip');
  if (!grid) return;

  grid.addEventListener('mouseover', (e) => {
    const day = e.target.closest('.heatmap-day');
    if (!day || !tooltip) return;
    const dayNum = Number(day.dataset.day);
    const info = UI.buildHeatmapDays(state.transactions).find((d) => d.day === dayNum);
    tooltip.hidden = false;
    tooltip.innerHTML = `<p class="tooltip-date">August ${dayNum}</p><p class="tooltip-amount">${UI.formatCurrency(info.total)}</p><p class="tooltip-count">${info.count} transaction${info.count === 1 ? '' : 's'}</p>`;
  });
  grid.addEventListener('mouseleave', () => {
    if (tooltip) tooltip.hidden = true;
  });
  grid.addEventListener('click', (e) => {
    const day = e.target.closest('.heatmap-day');
    if (!day) return;
    const dayNum = Number(day.dataset.day);
    state.heatmapSelectedDay = state.heatmapSelectedDay === dayNum ? null : dayNum;
    grid.querySelectorAll('.heatmap-day').forEach((d) => {
      d.classList.toggle('is-selected', Number(d.dataset.day) === state.heatmapSelectedDay);
    });
    applyHeatmapDayFilter();
  });
}

function applyHeatmapDayFilter() {
  const list = document.querySelector('.tx-list');
  if (!list) return;
  if (state.heatmapSelectedDay == null) {
    renderHistorySection();
    return;
  }
  const dayTx = state.transactions.filter(
    (t) => new Date(t.timestamp).getDate() === state.heatmapSelectedDay
  );
  UI.renderTransactionList(list, dayTx);
  const countEl = document.querySelector('.history-count');
  if (countEl) countEl.textContent = `${dayTx.length} transaction${dayTx.length === 1 ? '' : 's'} on Aug ${state.heatmapSelectedDay}`;
}

function renderHeatmapSection() {
  const grid = document.querySelector('.heatmap-grid');
  if (grid) UI.renderHeatmap(grid, state.transactions);
}

// ---- Flow visualization ---------------------------------------------

function initFlow() {
  // static container; content injected on render
}

function renderFlowSection() {
  const container = document.querySelector('.flow-viz');
  if (container) UI.renderFlow(container, state.transactions);
}

// ---- Personality -------------------------------------------------------

function initPersonality() {
  // Recompute triggers automatically whenever transactions change (see renderAll)
}

function renderPersonalitySection() {
  const container = document.querySelector('.personality-panel');
  if (container) UI.renderPersonalityReveal(container, state.personality);

  const scoreEl = document.querySelector('.roast-score-value');
  const scoreLabelEl = document.querySelector('.roast-score-label');
  if (scoreEl) Motion.countUp(scoreEl, 0, state.roastScore, 900);
  if (scoreLabelEl) scoreLabelEl.textContent = PersonalityEngine.roastScoreLabel(state.roastScore).toUpperCase();
}

// ---- Achievements ----------------------------------------------------

function initAchievements() {
  // static container; content injected on render
}

function renderAchievementsSection() {
  const grid = document.querySelector('.achievements-grid');
  if (grid) UI.renderAchievements(grid, state.achievements);
}

// ---- Money Wrapped -----------------------------------------------------

function buildWrappedData() {
  const byCategory = {};
  state.transactions.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const [topCategory, topCategoryAmount] =
    Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || ['—', 0];

  const questionable = [...state.transactions].sort((a, b) => b.amount - a.amount)[2] ||
    state.transactions[0] || { merchant: '—', amount: 0 };

  const smallTotal = state.transactions
    .filter((t) => t.amount <= 150)
    .reduce((s, t) => s + t.amount, 0);

  const total = state.transactions.reduce((s, t) => s + t.amount, 0);

  return {
    total,
    topCategory,
    topCategoryAmount,
    questionable,
    worstHabitAmount: smallTotal,
    personality: state.personality,
  };
}

function initWrapped() {
  const stage = document.querySelector('.wrapped-stage');
  const progress = document.querySelector('.wrapped-progress');
  const nextBtn = document.querySelector('.wrapped-next');
  const backBtn = document.querySelector('.wrapped-back');
  if (!stage) return;

  const slides = UI.buildWrappedSlides(buildWrappedData());

  function show(index) {
    state.wrappedIndex = Math.max(0, Math.min(slides.length - 1, index));
    UI.renderWrappedSlide(stage, slides[state.wrappedIndex], state.wrappedIndex, slides.length);
    UI.renderWrappedProgress(progress, state.wrappedIndex, slides.length);
    if (backBtn) backBtn.disabled = state.wrappedIndex === 0;
    if (nextBtn) nextBtn.textContent = state.wrappedIndex === slides.length - 1 ? 'REPLAY ↺' : 'NEXT →';
  }

  nextBtn?.addEventListener('click', () => {
    show(state.wrappedIndex === slides.length - 1 ? 0 : state.wrappedIndex + 1);
  });
  backBtn?.addEventListener('click', () => show(state.wrappedIndex - 1));

  document.addEventListener('keydown', (e) => {
    const section = document.getElementById('wrapped');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5;
    if (!inView) return;
    if (e.key === 'ArrowRight') nextBtn?.click();
    if (e.key === 'ArrowLeft') backBtn?.click();
  });

  show(0);
}

// ---- Share card ---------------------------------------------------------

function initShareCard() {
  const btn = document.querySelector('.share-trigger');
  const canvas = document.querySelector('.share-canvas');
  const downloadLink = document.querySelector('.share-download');
  if (!btn || !canvas) return;

  btn.addEventListener('click', () => {
    drawShareCard(canvas);
    canvas.hidden = false;
    canvas.scrollIntoView({ behavior: Motion.reduced() ? 'auto' : 'smooth', block: 'center' });
    if (downloadLink) {
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.hidden = false;
    }
  });
}

function drawShareCard(canvas) {
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const total = state.transactions.reduce((s, t) => s + t.amount, 0);
  const personality = state.personality;
  const score = state.roastScore;

  ctx.fillStyle = '#121110';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#2C2A25';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.fillStyle = '#FFB800';
  ctx.font = '600 28px Inter, sans-serif';
  ctx.fillText('ROAST.MONEY', 80, 130);

  ctx.fillStyle = '#A79E8C';
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillText('YOUR FINANCIAL DIAGNOSIS', 80, 175);

  ctx.fillStyle = '#F6F1E7';
  ctx.font = '600 62px Fraunces, serif';
  wrapText(ctx, personality ? personality.title : 'UNDIAGNOSED', 80, 270, width - 160, 68);

  ctx.fillStyle = '#F6F1E7';
  ctx.font = '400 30px Inter, sans-serif';
  ctx.fillText(`${UI.formatCurrency(total)} spent`, 80, 400);

  ctx.font = 'italic 400 32px Fraunces, serif';
  ctx.fillStyle = '#D9D2C2';
  wrapText(ctx, `"${personality ? personality.line : 'The data is still loading.'}"`, 80, 470, width - 160, 42);

  ctx.fillStyle = '#A79E8C';
  ctx.font = '500 20px Inter, sans-serif';
  ctx.fillText('ROAST LEVEL', 80, height - 220);

  ctx.fillStyle = '#FFB800';
  ctx.font = '700 120px Fraunces, serif';
  ctx.fillText(`${score}`, 80, height - 120);

  ctx.fillStyle = '#6E6759';
  ctx.font = '500 24px Inter, sans-serif';
  ctx.fillText('/100', 80 + ctx.measureText(`${score}`).width + 12, height - 120);

  ctx.fillStyle = '#6E6759';
  ctx.font = '400 20px Inter, sans-serif';
  ctx.fillText(PersonalityEngine.roastScoreLabel(score), 80, height - 70);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;
  words.forEach((word) => {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = `${word} `;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, x, cursorY);
}

// ---- Easter eggs -------------------------------------------------------

function initEasterEggs() {
  const logo = document.querySelector('.nav-logo');
  const eggToast = document.querySelector('.easter-egg-toast');

  if (logo) {
    logo.addEventListener('click', (e) => {
      state.logoClicks += 1;
      if (state.logoClicks >= 7) {
        e.preventDefault();
        showEggToast(eggToast, 'WHY ARE YOU CLICKING THIS?');
        state.logoClicks = 0;
      }
    });
  }
}

function showEggToast(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  setTimeout(() => el.classList.remove('is-visible'), 2600);
}
