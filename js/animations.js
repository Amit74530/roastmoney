/**
 * animations.js
 * Small, focused motion utilities. Nothing here runs on a perpetual loop;
 * everything is triggered by a real event (scroll into view, data change,
 * user input) and respects prefers-reduced-motion.
 */

const Motion = (() => {
  const reduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Animate a number from `from` to `to` over `duration` ms. */
  function countUp(el, from, to, duration = 900, formatter = (n) => Math.round(n)) {
    if (reduced()) {
      el.textContent = formatter(to);
      return;
    }
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const value = from + (to - from) * eased;
      el.textContent = formatter(value);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /** Reveal elements with [data-reveal] as they enter the viewport, once. */
  function initScrollReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduced()) {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach((el) => observer.observe(el));
  }

  /** Subtle magnetic pull toward the pointer for [data-magnetic] elements. */
  function initMagnetic() {
    if (reduced() || window.matchMedia('(pointer: coarse)').matches) return;
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = Number(el.dataset.magnetic) || 12;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });
  }

  /** Toggle the sticky nav's compact state based on scroll position. */
  function initNavScrollState(navEl) {
    if (!navEl) return;
    const onScroll = () => {
      navEl.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /** Update the active step in a horizontal/vertical scroll-driven sequence. */
  function initScrollSequence(sectionEl, stepEls, onActivate) {
    if (!sectionEl || !stepEls.length) return;
    if (!('IntersectionObserver' in window)) {
      onActivate(0);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(stepEls).indexOf(entry.target);
            if (idx > -1) onActivate(idx);
          }
        });
      },
      { threshold: 0.6 }
    );
    stepEls.forEach((el) => observer.observe(el));
  }

  return { countUp, initScrollReveal, initMagnetic, initNavScrollState, initScrollSequence, reduced };
})();
