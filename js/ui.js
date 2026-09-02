/**
 * ui.js
 * Pure(-ish) rendering functions. Each function takes data and writes DOM.
 * State mutation and event wiring live in app.js — this file only draws.
 */

const UI = (() => {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
        <p class="receipt-eyebrow">SPENDING DETECTED</p>
        <div class="receipt-main">
          <div>
            <p class="receipt-merchant">${escapeHtml(tx.merchant)}</p>
            <p class="receipt-category">${escapeHtml(tx.category)}</p>
          </div>
          <p class="receipt-amount">${formatCurrency(tx.amount)}</p>
        </div>
        <p class="receipt-time">${escapeHtml(tx.time)}</p>
        <div class="receipt-divider" aria-hidden="true"></div>
        <p class="receipt-status-label">ROAST STATUS</p>
        <p class="receipt-status-value">${escapeHtml(statusLabel)}</p>
        <p class="receipt-roast">"${escapeHtml(roastText)}"</p>
      `;
      el.classList.remove('is-updating');
    }, 180);
  }

  function walletMoodFromIntensity(intensity) {
    if (intensity <= 30) return { label: 'calm', dot: 'calm' };
    if (intensity <= 55) return { label: 'suspicious', dot: 'mild' };
    if (intensity <= 78) return { label: 'concerned', dot: 'questionable' };
    return { label: 'deeply concerned', dot: 'severe' };
  }

  // ---- Transaction history --------------------------------------------

  function renderTransactionRow(tx) {
    const intensity = tx.intensity ?? 0;
    return `
      <li class="tx-row" data-tx-id="${tx.id}" tabindex="0" role="button"
          aria-label="View details for ${escapeHtml(tx.merchant)}, ${formatCurrency(tx.amount)}">
        <span class="tx-cell tx-merchant">${escapeHtml(tx.merchant)}</span>
        <span class="tx-cell tx-category">${escapeHtml(tx.category)}</span>
        <span class="tx-cell tx-time">${formatDate(tx.timestamp)} · ${formatTime(tx.timestamp)}</span>
        <span class="tx-cell tx-amount">${formatCurrency(tx.amount)}</span>
        <span class="tx-cell tx-intensity">
          <span class="intensity-bar ${statusClass(intensity)}">
            <span class="intensity-fill" style="width:${intensity}%"></span>
          </span>
        </span>
        <button class="tx-delete" data-action="delete-tx" data-tx-id="${tx.id}" aria-label="Delete this transaction">✕</button>
      </li>
    `;
  }

  function renderTransactionList(container, transactions) {
    if (!transactions.length) {
      container.innerHTML = `
        <li class="empty-state" role="status">
          <p class="empty-title">NO TRANSACTIONS YET.</p>
          <p class="empty-copy">Your wallet is suspiciously quiet.</p>
          <button class="btn btn-primary" data-action="focus-lab">ADD YOUR FIRST MISTAKE</button>
        </li>`;
      return;
    }
    container.innerHTML = transactions.map(renderTransactionRow).join('');
  }

  function renderTransactionDetail(panel, tx) {
    if (!tx) {
      panel.innerHTML = `<p class="panel-placeholder">Select a transaction to see the full verdict.</p>`;
      panel.classList.remove('is-open');
      return;
    }
    panel.classList.add('is-open');
    panel.innerHTML = `
      <p class="panel-eyebrow">TRANSACTION DETAIL</p>
      <p class="panel-merchant">${escapeHtml(tx.merchant)}</p>
      <p class="panel-amount">${formatCurrency(tx.amount)}</p>
      <dl class="panel-meta">
        <div><dt>Category</dt><dd>${escapeHtml(tx.category)}</dd></div>
        <div><dt>Time</dt><dd>${formatDate(tx.timestamp)}, ${formatTime(tx.timestamp)}</dd></div>
        <div><dt>Transaction ID</dt><dd class="mono">${tx.id}</dd></div>
        <div><dt>Financial damage</dt><dd>${tx.intensity}/100</dd></div>
      </dl>
      <p class="panel-roast">"${escapeHtml(tx.roast)}"</p>
      <button class="btn btn-ghost" data-action="reroast" data-tx-id="${tx.id}">ROAST IT AGAIN</button>
    `;
  }

  // ---- How-it-works sequence -------------------------------------------

  function setActiveStep(stepEls, index) {
    stepEls.forEach((el, i) => el.classList.toggle('is-active', i === index));
  }

  // ---- Roast Lab loading sequence ---------------------------------------

  function runLoadingSequence(el, onDone) {
    const lines = ['checking amount…', 'questioning your decisions…', 'verdict ready.'];
    el.classList.add('is-active');
    el.innerHTML = `<p class="loading-title">ANALYZING PURCHASE…</p><p class="loading-line"></p>`;
    const lineEl = el.querySelector('.loading-line');
    let i = 0;
    const step = () => {
      if (i < lines.length) {
        lineEl.textContent = lines[i];
        i += 1;
        setTimeout(step, 380);
      } else {
        el.classList.remove('is-active');
        onDone();
      }
    };
    step();
  }

  // ---- Personality reveal -------------------------------------------

  function renderPersonalityReveal(container, personality) {
    if (!personality) {
      container.innerHTML = `<p class="empty-copy">Add a few transactions in the lab above to unlock your diagnosis.</p>`;
      return;
    }
    container.innerHTML = `
      <p class="personality-eyebrow">YOUR SPENDING PERSONALITY</p>
      <h3 class="personality-title">${escapeHtml(personality.title)}</h3>
      <p class="personality-line">"${escapeHtml(personality.line)}"</p>
      <div class="trait-grid">
        <div class="trait">
          <p class="trait-label">IMPULSE</p>
          <p class="trait-value" data-trait="impulse">0</p>
        </div>
        <div class="trait">
          <p class="trait-label">DISCIPLINE</p>
          <p class="trait-value" data-trait="discipline">0</p>
        </div>
        <div class="trait">
          <p class="trait-label">CHAOS</p>
          <p class="trait-value" data-trait="chaos">0</p>
        </div>
      </div>
      <p class="diagnosis-label">DIAGNOSIS</p>
      <p class="diagnosis-line">"${escapeHtml(personality.diagnosis)}"</p>
    `;
    ['impulse', 'discipline', 'chaos'].forEach((key) => {
      const target = container.querySelector(`[data-trait="${key}"]`);
      Motion.countUp(target, 0, personality.traits[key], 1000);
    });
  }

  // ---- Heatmap -------------------------------------------------------

  function buildHeatmapDays(transactions, year = 2026, month = 7 /* August, 0-indexed */) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dayTx = transactions.filter((t) => new Date(t.timestamp).getDate() === d);
      const total = dayTx.reduce((s, t) => s + t.amount, 0);
      days.push({ day: d, total, count: dayTx.length, transactions: dayTx });
    }
    return days;
  }

  function renderHeatmap(container, transactions) {
    const days = buildHeatmapDays(transactions);
    const max = Math.max(1, ...days.map((d) => d.total));
    container.innerHTML = days
      .map((d) => {
        const intensity = d.total / max;
        const level = intensity === 0 ? 0 : Math.max(1, Math.ceil(intensity * 4));
        return `
        <button class="heatmap-day" data-level="${level}" data-day="${d.day}"
          aria-label="August ${d.day}, ${formatCurrency(d.total)}, ${d.count} transactions">
          <span class="heatmap-day-number">${d.day}</span>
        </button>`;
      })
      .join('');
  }

  // ---- Money flow visualization ---------------------------------------

  function renderFlow(container, transactions) {
    const byCategory = {};
    transactions.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, v]) => v));

    container.querySelector('.flow-total-amount').textContent = formatCurrency(total);
    const branches = container.querySelector('.flow-branches');
    branches.innerHTML = entries
      .map(
        ([cat, amount]) => `
        <div class="flow-branch">
          <div class="flow-branch-track">
            <div class="flow-branch-fill" style="width:${(amount / max) * 100}%"></div>
          </div>
          <div class="flow-branch-meta">
            <span class="flow-branch-name">${escapeHtml(cat.toUpperCase())}</span>
            <span class="flow-branch-amount">${formatCurrency(amount)}</span>
          </div>
        </div>`
      )
      .join('');
  }

  // ---- Achievements ----------------------------------------------------

  function renderAchievements(container, achievements) {
    container.innerHTML = achievements
      .map((a) => {
        if (a.hidden && !a.unlocked) {
          return `
          <li class="achievement is-hidden">
            <span class="achievement-icon">?</span>
            <p class="achievement-title">Hidden achievement</p>
            <p class="achievement-desc">Keep spending to find out.</p>
          </li>`;
        }
        return `
        <li class="achievement ${a.unlocked ? 'is-unlocked' : ''}">
          <span class="achievement-icon">${a.icon}</span>
          <p class="achievement-title">${escapeHtml(a.title)}</p>
          <p class="achievement-desc">${escapeHtml(a.description)}</p>
          <div class="achievement-progress">
            <div class="achievement-progress-fill" style="width:${Math.round(a.progress * 100)}%"></div>
          </div>
        </li>`;
      })
      .join('');
  }

  // ---- Money Wrapped -----------------------------------------------------

  function buildWrappedSlides(data) {
    const { total, topCategory, topCategoryAmount, questionable, worstHabitAmount, personality } = data;
    return [
      {
        eyebrow: 'AUGUST 2026',
        big: formatCurrency(total),
        caption: 'You spent this much.',
      },
      {
        eyebrow: 'YOUR BIGGEST CATEGORY',
        big: topCategory.toUpperCase(),
        caption: formatCurrency(topCategoryAmount),
      },
      {
        eyebrow: 'YOUR MOST QUESTIONABLE PURCHASE',
        big: formatCurrency(questionable.amount),
        caption: `"${questionable.merchant}"`,
      },
      {
        eyebrow: 'YOUR WORST HABIT',
        big: formatCurrency(worstHabitAmount),
        caption: 'Small purchases that somehow became this.',
      },
      {
        eyebrow: 'YOUR SPENDING PERSONALITY',
        big: personality ? personality.title : '—',
        caption: personality ? personality.line : 'Add more transactions to unlock this.',
      },
      {
        eyebrow: 'FINAL VERDICT',
        big: 'FINANCIALLY? QUESTIONABLE.',
        caption: 'Personally? Consistent.',
      },
    ];
  }

  function renderWrappedSlide(container, slide, index, total) {
    container.innerHTML = `
      <p class="wrapped-eyebrow">${escapeHtml(slide.eyebrow)}</p>
      <p class="wrapped-big">${escapeHtml(slide.big)}</p>
      <p class="wrapped-caption">${escapeHtml(slide.caption)}</p>
    `;
    container.dataset.index = index;
  }

  function renderWrappedProgress(container, index, total) {
    container.innerHTML = Array.from({ length: total })
      .map((_, i) => `<span class="wrapped-progress-seg ${i <= index ? 'is-filled' : ''}"></span>`)
      .join('');
  }

  return {
    escapeHtml,
    formatCurrency,
    formatTime,
    formatDate,
    statusClass,
    renderHeroReceipt,
    walletMoodFromIntensity,
    renderTransactionList,
    renderTransactionDetail,
    setActiveStep,
    runLoadingSequence,
    renderPersonalityReveal,
    buildHeatmapDays,
    renderHeatmap,
    renderFlow,
    renderAchievements,
    buildWrappedSlides,
    renderWrappedSlide,
    renderWrappedProgress,
  };
})();
