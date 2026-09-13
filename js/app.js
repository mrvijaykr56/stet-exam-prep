/**
 * app.js — Core app initializer
 * Bihar STET 2026 CS Prep App
 */

import { getPreferences, setPreference, getCurrentStreak } from './storage.js';

// ── Theme ─────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
  const prefs = getPreferences();
  // Also check system preference if not set by user
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefs.theme || (systemDark ? 'dark' : 'light');
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  setPreference('theme', next);
}

// ── Navigation ────────────────────────────────────────────

function initNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.navbar__link');
  links.forEach(link => {
    // Remove any hard-coded active classes first
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && (href === currentPage || (currentPage === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });

  // Mobile hamburger — with ARIA state tracking
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
    mobileNav.querySelector('.mobile-nav__backdrop')?.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Theme toggle
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', toggleTheme);
}

// ── Toast Notifications ───────────────────────────────────

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    // ARIA live region so screen readers announce toasts
    toastContainer.setAttribute('role', 'status');
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'false');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'warning'|'danger'|'info'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  const icons = { success: '✅', warning: '⚠️', danger: '❌', info: 'ℹ️' };
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Show a custom confirmation modal (replaces native confirm()).
 * @param {string} message
 * @param {string} title
 * @param {Function} onConfirm - called when user confirms
 * @param {Function} [onCancel] - called when user cancels
 * @param {string} [confirmLabel]
 * @param {string} [confirmType]  btn class e.g. 'btn--danger'
 */
function showConfirmModal(message, title = 'Confirm', onConfirm, onCancel, confirmLabel = 'Confirm', confirmType = 'btn--primary') {
  const existing = document.getElementById('__confirm-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = '__confirm-modal-overlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn 0.2s ease;backdrop-filter:blur(4px);`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', '__confirm-modal-title');

  overlay.innerHTML = `
    <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-xl);max-width:420px;width:100%;padding:1.5rem;box-shadow:var(--shadow-xl);">
      <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.75rem;" id="__confirm-modal-title">${title}</div>
      <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1.5rem;line-height:1.6;">${message}</p>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button class="btn btn--ghost" id="__confirm-cancel-btn">Cancel</button>
        <button class="btn ${confirmType}" id="__confirm-ok-btn">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const doCancel = () => { overlay.remove(); if (typeof onCancel === 'function') onCancel(); };
  const doConfirm = () => { overlay.remove(); if (typeof onConfirm === 'function') onConfirm(); };

  overlay.querySelector('#__confirm-cancel-btn').addEventListener('click', doCancel);
  overlay.querySelector('#__confirm-ok-btn').addEventListener('click', doConfirm);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) doCancel(); });

  function escHandler(e) {
    if (e.key === 'Escape') { doCancel(); document.removeEventListener('keydown', escHandler); }
  }
  document.addEventListener('keydown', escHandler);
  // Auto-focus the cancel button for safety
  setTimeout(() => overlay.querySelector('#__confirm-cancel-btn')?.focus(), 50);
}

// ── Browser Notifications ─────────────────────────────────

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendDailyReminder(message = '📚 Time to study for STET 2026! Keep your streak going!') {
  if (Notification.permission === 'granted') {
    new Notification('Bihar STET 2026 Study Reminder', {
      body: message,
      icon: './icons/icon.svg', // data: URIs are rejected by the Notification API in most browsers
    });
  }
}

// ── Motivational Quotes ───────────────────────────────────

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Dream it. Believe it. Build it.", author: "Unknown" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "Consistency is the key to mastery.", author: "Robin Sharma" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The future belongs to those who prepare for it today.", author: "Malcolm X" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Your exam is a marathon, not a sprint. Pace yourself.", author: "Bihar STET Mentor" },
];

function getMotivationalQuote() {
  const streak = getCurrentStreak();
  let quote;
  if (streak >= 7) {
    quote = { text: "Amazing! A 7+ day streak! You're unstoppable. STET 2026 is yours!", author: "Your Progress" };
  } else if (streak >= 3) {
    quote = { text: `${streak} days in a row! Keep this momentum going. Bihar STET awaits!`, author: "Your Streak" };
  } else {
    const idx = Math.floor(Date.now() / 86400000) % QUOTES.length;
    quote = QUOTES[idx];
  }
  return quote;
}

// ── Utility: Format date ──────────────────────────────────

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes) {
  if (!minutes || minutes === 0) return '\u2014'; // Show em-dash for 0 (new user) instead of '0m'
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// ── Utility: Create SVG Progress Ring ────────────────────

let _ringIdCounter = 0;

/**
 * @param {number} percent 0-100
 * @param {number} size SVG size in px
 * @param {number} strokeWidth ring thickness
 * @param {string|null} gradientId Optional — auto-generated if omitted, preventing duplicate IDs
 */
function createProgressRing(percent, size = 120, strokeWidth = 8, gradientId = null) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  // Auto-generate a unique gradient ID so multiple rings on the same page don't collide
  const gId = gradientId || `ringGrad_${++_ringIdCounter}`;

  return `
    <svg class="progress-ring__svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="${gId}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#6366f1"/>
          <stop offset="100%" style="stop-color:#818cf8"/>
        </linearGradient>
      </defs>
      <circle class="progress-ring__track" cx="${size/2}" cy="${size/2}" r="${radius}" stroke-width="${strokeWidth}"/>
      <circle class="progress-ring__fill" cx="${size/2}" cy="${size/2}" r="${radius}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        stroke="url(#${gId})"
      />
    </svg>
  `;
}

// ── Utility: Animate number counter ──────────────────────

function animateCounter(element, target, duration = 1000, suffix = '') {
  let start = 0;
  // Guard: if target is 0 set immediately and bail
  if (target === 0) { element.textContent = '0' + suffix; return; }
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    element.textContent = Math.round(start) + suffix;
    if (start >= target) clearInterval(timer);
  }, 16);
}

// ── Service Worker Registration ───────────────────────────

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('SW registered'))
        .catch(e => console.warn('SW registration failed:', e));
    });
  }
}

// ── Fetch JSON helper ─────────────────────────────────────

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// ── Touch Swipe Engine ────────────────────────────────────

/**
 * Attach a horizontal swipe gesture listener to an element.
 * @param {HTMLElement} element
 * @param {Function} onSwipeLeft Callback for left swipe (Next)
 * @param {Function} onSwipeRight Callback for right swipe (Prev)
 */
function addSwipeListener(element, onSwipeLeft, onSwipeRight) {
  if (!element) return;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  element.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  element.addEventListener('touchend', (e) => {
    if (e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - startX;
    const deltaY = e.changedTouches[0].clientY - startY;
    const elapsedTime = Date.now() - startTime;

    // Minimum swipe distance 40px, max duration 500ms, horizontal dominance
    if (elapsedTime <= 500 && Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && typeof onSwipeLeft === 'function') {
        if (navigator.vibrate) navigator.vibrate(10); // Haptic feedback
        onSwipeLeft();
      } else if (deltaX > 0 && typeof onSwipeRight === 'function') {
        if (navigator.vibrate) navigator.vibrate(10);
        onSwipeRight();
      }
    }
  }, { passive: true });
}

/** Show a one-time swipe gesture hint (mobile only) */
function showSwipeHint() {
  if (window.innerWidth > 768) return;
  if (localStorage.getItem('stet_swipe_hint_shown')) return;
  localStorage.setItem('stet_swipe_hint_shown', '1');
  const hint = document.createElement('div');
  hint.className = 'swipe-hint';
  hint.textContent = '← Swipe to navigate questions →';
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 5500);
}

// ── Render Mobile Bottom Nav ──────────────────────────────

function renderMobileBottomNav() {
  if (document.querySelector('.mobile-bottom-nav')) return;

  const path = window.location.pathname.split('/').pop() || 'index.html';
  // 6 items — matches the desktop nav (Materials was previously missing)
  const navItems = [
    { page: 'index.html',     label: 'Home',      icon: '🏠' },
    { page: 'syllabus.html',  label: 'Syllabus',  icon: '📚' },
    { page: 'materials.html', label: 'Materials',  icon: '📖' },
    { page: 'practice.html',  label: 'Practice',  icon: '🎯' },
    { page: 'mock-exam.html', label: 'Exam',      icon: '📝' },
    { page: 'progress.html',  label: 'Progress',  icon: '📊' },
  ];

  const navEl = document.createElement('nav');
  navEl.className = 'mobile-bottom-nav';
  navEl.setAttribute('aria-label', 'Mobile bottom navigation');

  navEl.innerHTML = navItems.map(item => {
    const isActive = path === item.page || (path === '' && item.page === 'index.html');
    return `
      <a href="${item.page}" class="mobile-bottom-nav__item ${isActive ? 'active' : ''}">
        <span class="mobile-bottom-nav__icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `;
  }).join('');

  document.body.appendChild(navEl);
}

// ── Init ──────────────────────────────────────────────────

function initApp() {
  initTheme();
  initNav();
  renderMobileBottomNav();
  registerServiceWorker();

  // Offline / Online status toasts
  window.addEventListener('offline', () => showToast('📡 You are offline. The app works on cached data.', 'warning', 5000));
  window.addEventListener('online',  () => showToast('✅ You are back online!', 'success', 3000));
}

export {
  initApp,
  applyTheme,
  toggleTheme,
  showToast,
  showConfirmModal,
  showSwipeHint,
  requestNotificationPermission,
  sendDailyReminder,
  getMotivationalQuote,
  formatDate,
  formatTime,
  formatDuration,
  createProgressRing,
  animateCounter,
  fetchJSON,
  addSwipeListener,
};
