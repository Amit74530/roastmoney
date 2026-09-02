/**
 * personality-engine.js
 * Computes spending personality, trait scores, roast score and achievement
 * progress — all derived from the actual transaction list, never hardcoded.
 */

const PersonalityEngine = (() => {
  const PERSONALITIES = [
    {
      id: 'emotional',
      title: 'THE EMOTIONAL SPENDER',
      line: "You don't buy things because you need them. You buy them because Tuesday felt difficult.",
      match: (m) => m.lateNightRatio * 0.5 + m.impulseRatio * 0.3 + m.foodRatio * 0.2,
    },
    {
      id: 'micro',
      title: 'THE MICRO-SPENDER',
      line: 'Nothing you buy costs more than a coffee, yet somehow it adds up to a small car.',
      match: (m) => m.smallPurchaseRatio * 0.7 + (1 - m.avgAmountNorm) * 0.3,
    },
    {
      id: 'weekend',
      title: 'THE WEEKEND MILLIONAIRE',
      line: 'Monday to Friday: monk. Saturday: a completely different, much richer person.',
      match: (m) => m.weekendRatio,
    },
    {
      id: 'impulse',
      title: 'THE IMPULSE LORD',
      line: 'You saw it. You wanted it. Fourteen seconds passed. It is now yours.',
      match: (m) => m.impulseRatio * 0.6 + m.burstRatio * 0.4,
    },
    {
      id: 'food',
      title: 'THE FOOD MINISTER',
      line: 'Your kitchen is a museum exhibit titled "What Cooking Once Looked Like".',
      match: (m) => m.foodRatio,
    },
    {
      id: 'optimist',
      title: 'THE OPTIMIST',
      line: 'Every purchase is "an investment." Every sale is "basically free money."',
      match: (m) => m.disciplineNorm * 0.4 + (1 - m.chaosNorm) * 0.3 + m.avgAmountNorm * 0.3,
    },
    {
      id: 'subscriber',
      title: 'THE SERIAL SUBSCRIBER',
      line: "You're subscribed to things you forgot exist. They have not forgotten you.",
      match: (m) => m.subscriptionRatio,
    },
    {
      id: 'control',
      title: 'THE CONTROL FREAK',
      line: 'Every rupee is accounted for. Spontaneity was priced out of your budget years ago.',
      match: (m) => m.disciplineNorm,
    },
    {
      id: 'chaos',
      title: 'THE CHAOS AGENT',
      line: 'There is no pattern. There is no plan. There is only vibes and a shrinking balance.',
      match: (m) => m.chaosNorm,
    },
    {
      id: 'strategist',
      title: 'THE STRATEGIST',
      line: 'You spend like it is a game you intend to win, and mostly, you are winning.',
      match: (m) => m.disciplineNorm * 0.5 + (1 - m.impulseRatio) * 0.5,
    },
  ];

  function safeDiv(a, b) {
    return b === 0 ? 0 : a / b;
  }

  function computeMetrics(transactions) {
    if (!transactions.length) return null;

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const avg = total / transactions.length;

    const byCategory = {};
    transactions.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    const foodRatio = safeDiv(byCategory.Food || 0, total);
    const shoppingRatio = safeDiv(byCategory.Shopping || 0, total);
    const subscriptionRatio = safeDiv(byCategory.Subscriptions || 0, total);

    const lateNightCount = transactions.filter((t) => {
      const h = new Date(t.timestamp).getHours();
      return h >= 0 && h < 5;
    }).length;
    const lateNightRatio = safeDiv(lateNightCount, transactions.length);

    const smallCount = transactions.filter((t) => t.amount <= 150).length;
    const smallPurchaseRatio = safeDiv(smallCount, transactions.length);

    const largeCount = transactions.filter((t) => t.amount >= 3000).length;
    const largeRatio = safeDiv(largeCount, transactions.length);

    const weekendTotal = transactions
      .filter((t) => [0, 6].includes(new Date(t.timestamp).getDay()))
      .reduce((s, t) => s + t.amount, 0);
    const weekendRatio = safeDiv(weekendTotal, total);

    // "Impulse" = purchases with no obvious planning signal: small-to-medium,
    // outside of bills/subscriptions, happening in bursts.
    const impulseCount = transactions.filter(
      (t) => !['Bills', 'Subscriptions'].includes(t.category) && t.amount < 3000
    ).length;
    const impulseRatio = safeDiv(impulseCount, transactions.length);

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    let burstEvents = 0;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const gapMinutes = Math.abs(
        new Date(sorted[i + 1].timestamp) - new Date(sorted[i].timestamp)
      ) / 60000;
      if (gapMinutes <= 45) burstEvents += 1;
    }
    const burstRatio = Math.min(1, safeDiv(burstEvents, transactions.length));

    const avgAmountNorm = Math.min(1, avg / 3000);
    const disciplineNorm = Math.max(
      0,
      1 - (lateNightRatio * 0.4 + impulseRatio * 0.35 + burstRatio * 0.25)
    );
    const chaosNorm = Math.min(
      1,
      lateNightRatio * 0.35 + burstRatio * 0.35 + largeRatio * 0.3
    );

    return {
      total,
      avg,
      count: transactions.length,
      foodRatio,
      shoppingRatio,
      subscriptionRatio,
      lateNightRatio,
      smallPurchaseRatio,
      largeRatio,
      weekendRatio,
      impulseRatio,
      burstRatio,
      avgAmountNorm,
      disciplineNorm,
      chaosNorm,
      byCategory,
    };
  }

  function computePersonality(transactions) {
    const m = computeMetrics(transactions);
    if (!m) return null;

    const scored = PERSONALITIES.map((p) => ({ ...p, score: p.match(m) }))
      .sort((a, b) => b.score - a.score);

    const winner = scored[0];

    const impulse = Math.round(
      Math.min(100, (m.impulseRatio * 0.6 + m.burstRatio * 0.4) * 100)
    );
    const discipline = Math.round(m.disciplineNorm * 100);
    const chaos = Math.round(m.chaosNorm * 100);

    const diagnosisPct = Math.max(28, Math.min(91, Math.round(discipline * 0.6 + (100 - chaos) * 0.4)));

    return {
      id: winner.id,
      title: winner.title,
      line: winner.line,
      metrics: m,
      traits: { impulse, discipline, chaos },
      diagnosis: `Your spending pattern suggests you make excellent financial decisions approximately ${diagnosisPct}% of the time.`,
    };
  }

  function computeRoastScore(transactions) {
    const m = computeMetrics(transactions);
    if (!m) return 0;
    // Each term below is a 0–1 ratio scaled by a weight; weights sum to 100,
    // so `raw` already lands in the 0–100 range.
    const raw =
      m.chaosNorm * 40 +
      m.lateNightRatio * 20 +
      m.largeRatio * 20 +
      m.subscriptionRatio * 10 +
      (1 - m.disciplineNorm) * 10;
    return Math.round(Math.max(0, Math.min(100, raw)));
  }

  function roastScoreLabel(score) {
    if (score <= 20) return 'Responsible';
    if (score <= 40) return 'Slightly Suspicious';
    if (score <= 60) return 'Questionable';
    if (score <= 80) return 'Concerning';
    return 'Financial Menace';
  }

  // ---- Achievements ------------------------------------------------------

  const ACHIEVEMENT_DEFS = [
    {
      id: 'midnight-menace',
      title: 'Midnight Menace',
      description: 'Spent money after midnight.',
      icon: '🌙',
      hidden: false,
      evaluate: (txs) => {
        const hits = txs.filter((t) => {
          const h = new Date(t.timestamp).getHours();
          return h >= 0 && h < 5;
        }).length;
        return { unlocked: hits >= 1, progress: Math.min(1, hits / 1) };
      },
    },
    {
      id: '99-trap',
      title: '₹99 Trap',
      description: '10+ purchases under ₹100.',
      icon: '🪙',
      hidden: false,
      evaluate: (txs) => {
        const hits = txs.filter((t) => t.amount < 100).length;
        return { unlocked: hits >= 10, progress: Math.min(1, hits / 10) };
      },
    },
    {
      id: 'food-minister',
      title: 'Food Minister',
      description: '₹10,000+ spent on food.',
      icon: '🍜',
      hidden: false,
      evaluate: (txs) => {
        const total = txs.filter((t) => t.category === 'Food').reduce((s, t) => s + t.amount, 0);
        return { unlocked: total >= 10000, progress: Math.min(1, total / 10000) };
      },
    },
    {
      id: 'impulse-lord',
      title: 'Impulse Lord',
      description: '5 purchases within 30 minutes of each other.',
      icon: '⚡',
      hidden: true,
      evaluate: (txs) => {
        const sorted = [...txs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        let maxBurst = 1;
        let current = 1;
        for (let i = 1; i < sorted.length; i += 1) {
          const gap = (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / 60000;
          current = gap <= 30 ? current + 1 : 1;
          maxBurst = Math.max(maxBurst, current);
        }
        return { unlocked: maxBurst >= 5, progress: Math.min(1, maxBurst / 5) };
      },
    },
    {
      id: 'subscription-collector',
      title: 'Subscription Collector',
      description: '5+ recurring payments.',
      icon: '📦',
      hidden: false,
      evaluate: (txs) => {
        const count = txs.filter((t) => t.category === 'Subscriptions').length;
        return { unlocked: count >= 5, progress: Math.min(1, count / 5) };
      },
    },
    {
      id: 'weekend-millionaire',
      title: 'Weekend Millionaire',
      description: 'Spent 40%+ of your money over the weekend.',
      icon: '🏝️',
      hidden: false,
      evaluate: (txs) => {
        const m = computeMetrics(txs);
        const ratio = m ? m.weekendRatio : 0;
        return { unlocked: ratio >= 0.4, progress: Math.min(1, ratio / 0.4) };
      },
    },
    {
      id: 'its-only-299',
      title: 'The "It\'s Only ₹299" Person',
      description: '15+ small purchases under ₹300.',
      icon: '🧾',
      hidden: true,
      evaluate: (txs) => {
        const count = txs.filter((t) => t.amount < 300).length;
        return { unlocked: count >= 15, progress: Math.min(1, count / 15) };
      },
    },
  ];

  function computeAchievements(transactions) {
    return ACHIEVEMENT_DEFS.map((def) => {
      const result = def.evaluate(transactions);
      return { ...def, ...result };
    });
  }

  return {
    computeMetrics,
    computePersonality,
    computeRoastScore,
    roastScoreLabel,
    computeAchievements,
    ACHIEVEMENT_DEFS,
  };
})();
