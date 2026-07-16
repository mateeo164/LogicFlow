(function () {
  'use strict';

  function ensureToastContainer() {
    let container = document.getElementById('lf-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'lf-toast-container';
      container.className = 'lf-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(message, options = {}) {
    const { type = 'info', title = '', duration = 4000 } = options;
    const container = ensureToastContainer();

    const icons = {
      success: `<svg class="lf-toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg class="lf-toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warning: `<svg class="lf-toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info: `<svg class="lf-toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const el = document.createElement('div');
    el.className = `lf-toast lf-toast--${type}`;
    el.innerHTML = `
      ${icons[type] || icons.info}
      <div class="lf-toast__content">
        ${title ? `<div class="lf-toast__title">${title}</div>` : ''}
        <div class="lf-toast__message">${message}</div>
      </div>
    `;

    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 0.25s ease';
      setTimeout(() => el.remove(), 250);
    }, duration);

    return el;
  }

  function initScrollReveal(selector = '[data-reveal]') {
    if (!window.IntersectionObserver) {
      document.querySelectorAll(selector).forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('lf-is-visible');
          }, parseInt(delay, 10));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    const revealables = document.querySelectorAll(selector);
    revealables.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      observer.observe(el);
    });

    setTimeout(() => {
      revealables.forEach(el => el.classList.add('lf-is-visible'));
    }, 2500);
  }

  function animateCounter(el, target, duration = 1500, suffix = '') {
    const start = performance.now();
    const startVal = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;

    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(startVal + (target - startVal) * ease);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  function initCounters(selector = '[data-count]') {
    if (!window.IntersectionObserver) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10) || 0;
          const suffix = el.dataset.suffix || '';
          animateCounter(el, target, 1800, suffix);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll(selector).forEach(el => observer.observe(el));
  }

  function initNavbarScroll(selector = '.lf-header, .dashboard-header') {
    const navs = document.querySelectorAll(selector);
    if (!navs.length) return;

    let ticking = false;
    function update() {
      const scrolled = window.scrollY > 10;
      navs.forEach(nav => nav.classList.toggle('scrolled', scrolled));
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  function initTiltCards(selector = '[data-tilt]') {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    document.querySelectorAll(selector).forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });

      card.style.transition = 'transform 0.15s ease';
      card.style.transformStyle = 'preserve-3d';
    });
  }

  function initSmoothAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        let target;
        try {
          target = document.querySelector(targetId);
        } catch (err) {
          return;
        }
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function replaceWithInitials(img) {
    const span = document.createElement('span');
    span.className = 'academic-footer-team-photo academic-footer-team-photo--fallback';
    span.textContent = img.dataset.initials || '';
    img.replaceWith(span);
  }

  function initTeamPhotoFallback(selector = '.academic-footer-team-photo[data-initials]') {
    document.querySelectorAll(selector).forEach(img => {
      if (img.tagName !== 'IMG') return;
      if (img.complete && img.naturalWidth === 0) {
        replaceWithInitials(img);
      } else {
        img.addEventListener('error', () => replaceWithInitials(img), { once: true });
      }
    });
  }

  function init() {
    initScrollReveal();
    initCounters();
    initNavbarScroll();
    initTiltCards();
    initSmoothAnchorScroll();
    initTeamPhotoFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LFUI = {
    toast,
    animateCounter,
    initScrollReveal,
    initCounters,
    initNavbarScroll,
    initTiltCards,
    initSmoothAnchorScroll
  };
})();
