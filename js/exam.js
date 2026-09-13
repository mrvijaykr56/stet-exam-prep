/**
 * exam.js — Mock Exam module
 * Bihar STET 2026 CS Prep App
 */

import { fetchJSON, showToast, createProgressRing, animateCounter, addSwipeListener, showConfirmModal, showSwipeHint } from './app.js';

import {
  saveResult, updateStreak, checkAndAwardBadges,
  isBookmarked, toggleBookmark, addMistake, removeMistake, addStudySession, getRecentResults,
} from './storage.js';

let allQuestions  = [];
let syllabusUnits = [];
let examQs        = [];
let currentIndex  = 0;
let score         = 0;
let userAnswers   = [];    // index or null for each question
let timerInterval = null;
let timeLeft      = 0;
let totalTime     = 0;     // original chosen duration — used for % based timer warnings
let examStartTime = null;

// ── Init ──────────────────────────────────────────────────

async function initExam() {
  const container = document.getElementById('exam-app');
  if (!container) return;

  try {
    container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading exam engine…</span></div>`;
    const [qData, sData] = await Promise.all([
      fetchJSON('./data/questions.json'),
      fetchJSON('./data/syllabus.json'),
    ]);
    allQuestions  = qData.questions;
    syllabusUnits = sData.units;
    renderExamSetup(container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon">⚠️</div>
      <div class="empty-state__title">Failed to load exam engine</div>
      <p>Please run through a local server.</p>
    </div>`;
    console.error(err);
  }
}

// ── Setup Screen ──────────────────────────────────────────

function renderExamSetup(container) {
  container.innerHTML = `
    <div class="quiz-container animate-fadeIn">
      <div class="card" style="overflow:hidden; margin-bottom:1.5rem;">
        <div style="background:linear-gradient(135deg,#1e3a5f 0%,#5b21b6 100%);padding:2.5rem;text-align:center;">
          <div style="font-size:3.5rem;margin-bottom:1rem;">📝</div>
          <h1 style="color:#fff;font-size:2rem;margin-bottom:0.5rem;">Mock Exam</h1>
          <p style="color:rgba(255,255,255,0.75);">Simulate real Bihar STET 2026 exam conditions</p>
        </div>
        <div style="padding:2rem;">
          <div class="setup-form-grid">
            <div class="form-group">
              <label class="form-label" for="exam-count">📊 Number of Questions</label>
              <select id="exam-count" class="form-select">
                <option value="10">10 Questions</option>
                <option value="20">20 Questions</option>
                <option value="30">30 Questions</option>
                <option value="50" selected>50 Questions (Full Test)</option>
                <option value="all">All Available</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="exam-time">⏱️ Time Limit</label>
              <select id="exam-time" class="form-select">
                <option value="900">15 minutes</option>
                <option value="1800">30 minutes</option>
                <option value="3600" selected>60 minutes</option>
                <option value="5400">90 minutes</option>
                <option value="7200">120 minutes</option>
                <option value="0">No Limit</option>
              </select>
            </div>
          </div>

          <div style="background:var(--bg-surface-2);border-radius:12px;padding:1.25rem;margin-bottom:1.5rem;">
            <div style="font-weight:600;margin-bottom:0.75rem;font-size:0.9rem;">📋 Exam Instructions</div>
            <ul style="list-style:none;display:flex;flex-direction:column;gap:0.4rem;font-size:0.85rem;color:var(--text-secondary);">
              <li>• Questions from all units will appear randomly</li>
              <li>• You can navigate between questions using Prev / Next</li>
              <li>• Mark questions for review using the flag button</li>
              <li>• Results and detailed review shown after submission</li>
              <li>• Timer alerts at 50% and 25% remaining time</li>
              <li>• Your result is saved automatically</li>
            </ul>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;text-align:center;">
            <div style="padding:1rem;background:var(--bg-surface-2);border-radius:12px;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--text-accent);">${allQuestions.length}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Questions Available</div>
            </div>
            <div style="padding:1rem;background:var(--bg-surface-2);border-radius:12px;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--color-success);">${syllabusUnits.length}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Units Covered</div>
            </div>
            <div style="padding:1rem;background:var(--bg-surface-2);border-radius:12px;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--color-warning);">100</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Total Marks</div>
            </div>
          </div>

          <button id="start-exam-btn" class="btn btn--primary btn--lg btn--full" onclick="window.beginExam()">
            🚀 Start Mock Exam
          </button>
        </div>
      </div>

      <div id="history-section"></div>
    </div>
  `;
  renderResultsHistory(document.getElementById('history-section'));
  window.beginExam = () => beginExam(container);
}

// ── Begin Exam ────────────────────────────────────────────

function generateBalancedExam(allQuestions, targetCountVal) {
  if (targetCountVal === 'all') {
    return [...allQuestions].sort(() => Math.random() - 0.5);
  }
  const count = parseInt(targetCountVal);
  if (count >= allQuestions.length) {
    return [...allQuestions].sort(() => Math.random() - 0.5);
  }

  const unitWeights = {
    unit1: 0.10, unit2: 0.10, unit3: 0.12, unit4: 0.08, unit5: 0.10,
    unit6: 0.10, unit7: 0.10, unit8: 0.06, unit9: 0.06, unit10: 0.04,
    unit11: 0.06, unit12: 0.02, unit13: 0.04, unit14: 0.01, unit15: 0.01
  };

  const unitMap = {};
  allQuestions.forEach(q => {
    if (!unitMap[q.unit]) unitMap[q.unit] = [];
    unitMap[q.unit].push(q);
  });

  Object.keys(unitMap).forEach(u => {
    unitMap[u].sort(() => Math.random() - 0.5);
  });

  const selected = [];
  const selectedIds = new Set();

  Object.entries(unitWeights).forEach(([unitId, weight]) => {
    const pool = unitMap[unitId] || [];
    const desired = Math.max(1, Math.round(count * weight));
    const toTake = Math.min(pool.length, desired);
    for (let i = 0; i < toTake; i++) {
      if (selected.length < count && !selectedIds.has(pool[i].id)) {
        selected.push(pool[i]);
        selectedIds.add(pool[i].id);
      }
    }
  });

  if (selected.length < count) {
    const remainingPool = allQuestions.filter(q => !selectedIds.has(q.id)).sort(() => Math.random() - 0.5);
    for (const q of remainingPool) {
      if (selected.length >= count) break;
      selected.push(q);
      selectedIds.add(q.id);
    }
  }

  return selected.sort(() => Math.random() - 0.5);
}

function beginExam(container) {
  const countVal = document.getElementById('exam-count').value;
  const timeVal  = parseInt(document.getElementById('exam-time').value);

  const qs = generateBalancedExam(allQuestions, countVal);
  examQs        = qs;
  currentIndex  = 0;
  score         = 0;
  userAnswers   = new Array(qs.length).fill(null);
  timeLeft      = timeVal;
  totalTime     = timeVal;    // store original for % warnings
  examStartTime = Date.now();
  window._flaggedQs = new Set(); // always start fresh — don't carry over from previous exam

  renderExamQuestion(container);
  if (timeVal > 0) startTimer(container);
}

// ── Timer ─────────────────────────────────────────────────

function startTimer(container) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay(container);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showToast('⏰ Time is up! Submitting your exam…', 'warning', 4000);
      setTimeout(() => submitExam(container), 2000);
    }
  }, 1000);
}

function updateTimerDisplay(container) {
  const el = document.getElementById('exam-timer');
  if (!el) return;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  // Warning states — percentage-based (50% = warning, 25% = danger)
  const wrap = el.closest('.quiz-timer');
  if (wrap) {
    wrap.classList.remove('warning', 'danger');
    const pct = totalTime > 0 ? timeLeft / totalTime : 1;
    if (pct <= 0.25) wrap.classList.add('danger');
    else if (pct <= 0.50) wrap.classList.add('warning');
  }
}

function stopTimer() {
  clearInterval(timerInterval);
}

// ── Render Exam Question ──────────────────────────────────

function renderExamQuestion(container) {
  if (currentIndex >= examQs.length) {
    submitExam(container);
    return;
  }
  const q = examQs[currentIndex];
  const labels = ['A', 'B', 'C', 'D'];
  const answered = userAnswers[currentIndex];
  const flagged  = window._flaggedQs || new Set();

  const questionNavHtml = examQs.map((_, i) => {
    const ua = userAnswers[i];
    const isFlag = flagged.has(i);
    const bg = i === currentIndex ? 'var(--color-primary-500)' :
               ua !== null ? 'var(--color-success)' :
               isFlag ? 'var(--color-warning)' : 'var(--bg-surface-2)';
    const color = (i === currentIndex || ua !== null) ? '#fff' : isFlag ? '#fff' : 'var(--text-secondary)';
    return `<button onclick="window.goToQuestion(${i})" style="width:32px;height:32px;border-radius:6px;border:none;cursor:pointer;font-size:0.75rem;font-weight:700;background:${bg};color:${color};transition:all 0.2s;">${i+1}</button>`;
  }).join('');

  container.innerHTML = `
    <div class="exam-layout-grid animate-fadeIn">
      <!-- Main question area -->
      <div>
        <div class="quiz-header" style="margin-bottom:1.5rem;">
          <div>
            <div class="quiz-counter" style="font-size:1rem;font-weight:700;">Question ${currentIndex+1} / ${examQs.length} <span style="font-size:0.7rem;color:var(--text-muted);">(Use 1-4, Arrows, F)</span></div>
            <div class="progress-wrap" style="width:100%;max-width:300px;margin-top:0.5rem;">
              <div class="progress-bar" style="width:${((currentIndex)/examQs.length)*100}%"></div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <button onclick="window.toggleQuestionBookmark('${q.id}')" class="btn btn--sm btn--ghost"
              style="${isBookmarked(q.id) ? 'color:var(--color-warning);border-color:var(--color-warning);' : ''}">
              ${isBookmarked(q.id) ? '★ Bookmarked' : '☆ Bookmark'}
            </button>
            ${timeLeft > 0 ? `<div class="quiz-timer">⏱️ <span id="exam-timer">--:--</span></div>` : ''}
            <button onclick="window.flagQuestion()" id="flag-btn" class="btn btn--sm btn--ghost" 
              style="${window._flaggedQs?.has(currentIndex) ? 'color:var(--color-warning);border-color:var(--color-warning);' : ''}">
              🚩 Flag
            </button>
          </div>
        </div>

        <div class="question-card">
          <div style="display:flex;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <div class="question-number">Q${currentIndex+1}</div>
            <div style="display:flex;gap:0.5rem;">
              <span class="badge badge--primary">${q.topic || 'General'}</span>
              <span class="badge badge--${q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'danger' : 'warning'}">${q.difficulty}</span>
            </div>
          </div>
          <div class="question-text">${q.question}</div>
          <div class="options-list" id="options-list">
            ${q.options.map((opt, i) => `
              <div class="option-item ${answered === i ? 'selected' : ''}" 
                   data-index="${i}" role="button" tabindex="0">
                <div class="option-marker">${labels[i]}</div>
                <div class="option-text">${opt}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;flex-wrap:wrap;gap:0.75rem;">
          <button class="btn btn--secondary" ${currentIndex === 0 ? 'disabled' : ''} onclick="window.goToQuestion(${currentIndex-1})">
            ← Previous
          </button>
          <button class="btn btn--danger" onclick="window.confirmSubmit()">
            🏁 Submit Exam
          </button>
          <button class="btn btn--primary" onclick="window.goToQuestion(${currentIndex+1})"
            ${currentIndex === examQs.length-1 ? 'style="display:none"' : ''}>
            Next →
          </button>
        </div>
      </div>

      <!-- Question nav sidebar -->
      <div>
        <div class="card exam-nav-card" style="position:sticky;top:80px;">
          <div style="font-size:0.85rem;font-weight:600;margin-bottom:1rem;color:var(--text-primary);">📊 Question Navigator</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1rem;" id="question-nav">
            ${questionNavHtml}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.75rem;color:var(--text-muted);">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:16px;height:16px;border-radius:4px;background:var(--color-success);"></div> Answered
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:16px;height:16px;border-radius:4px;background:var(--color-warning);"></div> Flagged
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:16px;height:16px;border-radius:4px;background:var(--bg-surface-2);"></div> Not Visited
            </div>
          </div>
          <div class="divider"></div>
          <div style="font-size:0.8rem;color:var(--text-secondary);">
            <div>✅ Answered: <strong>${userAnswers.filter(a => a !== null).length}</strong></div>
            <div>🔲 Remaining: <strong>${userAnswers.filter(a => a === null).length}</strong></div>
            <div>🚩 Flagged: <strong>${window._flaggedQs?.size || 0}</strong></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Update timer display immediately
  if (timeLeft > 0) updateTimerDisplay(container);

  // Option handlers
  container.querySelectorAll('.option-item').forEach(optEl => {
    optEl.addEventListener('click', () => {
      userAnswers[currentIndex] = parseInt(optEl.dataset.index);
      container.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
      optEl.classList.add('selected');
      updateQuestionNav(container);
    });
    optEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') optEl.click();
    });
  });

  // Attach swipe listener to the outer container (avoids touch event blocking by option buttons)
  const swipeZone = container.querySelector('.exam-layout-grid') || container;
  addSwipeListener(swipeZone,
    () => { if (currentIndex + 1 < examQs.length) window.goToQuestion(currentIndex + 1); },
    () => { if (currentIndex > 0) window.goToQuestion(currentIndex - 1); }
  );
  showSwipeHint();

  // Navigation callbacks
  window.goToQuestion = (idx) => {
    if (idx < 0 || idx >= examQs.length) return;
    currentIndex = idx;
    renderExamQuestion(container);
  };

  window.toggleQuestionBookmark = (qId) => {
    const isAdded = toggleBookmark(qId);
    showToast(isAdded ? '★ Question bookmarked!' : '☆ Bookmark removed', 'info');
    renderExamQuestion(container);
  };

  window.flagQuestion = () => {
    window._flaggedQs = window._flaggedQs || new Set();
    if (window._flaggedQs.has(currentIndex)) window._flaggedQs.delete(currentIndex);
    else window._flaggedQs.add(currentIndex);
    renderExamQuestion(container);
  };

  window.confirmSubmit = () => {
    const remaining = userAnswers.filter(a => a === null).length;
    if (remaining > 0) {
      showConfirmModal(
        `You have <strong>${remaining}</strong> unanswered question(s). Submitting now will count them as wrong.`,
        '⚠️ Submit Exam?',
        () => { stopTimer(); submitExam(container); },
        null,
        'Submit Anyway',
        'btn--danger'
      );
    } else {
      stopTimer();
      submitExam(container);
    }
  };

  setupExamKeyboardShortcuts(container);
}

let _examKeyHandler = null;
function setupExamKeyboardShortcuts(container) {
  // Remove previous handler before attaching a fresh one — prevents duplicate listeners
  // This mirrors the practice.js pattern and avoids the "flag never resets" bug
  if (_examKeyHandler) window.removeEventListener('keydown', _examKeyHandler);
  _examKeyHandler = (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (!examQs.length || currentIndex >= examQs.length) return;

    const key = e.key.toLowerCase();
    const optEls = container.querySelectorAll('.option-item');
    if (['1', 'a'].includes(key) && optEls[0]) optEls[0].click();
    else if (['2', 'b'].includes(key) && optEls[1]) optEls[1].click();
    else if (['3', 'c'].includes(key) && optEls[2]) optEls[2].click();
    else if (['4', 'd'].includes(key) && optEls[3]) optEls[3].click();
    else if (key === 'f') window.flagQuestion();
    else if (key === 'arrowleft' && currentIndex > 0) window.goToQuestion(currentIndex - 1);
    else if (key === 'arrowright' && currentIndex < examQs.length - 1) window.goToQuestion(currentIndex + 1);
  };
  window.addEventListener('keydown', _examKeyHandler);
}


function updateQuestionNav(container) {
  const navEl = container.querySelector('#question-nav');
  if (!navEl) return;
  const flagged = window._flaggedQs || new Set();
  examQs.forEach((_, i) => {
    const btn = navEl.children[i];
    if (!btn) return;
    const ua = userAnswers[i];
    const isFlag = flagged.has(i);
    btn.style.background = i === currentIndex ? 'var(--color-primary-500)' :
                           ua !== null ? 'var(--color-success)' :
                           isFlag ? 'var(--color-warning)' : 'var(--bg-surface-2)';
    btn.style.color = (i === currentIndex || ua !== null || isFlag) ? '#fff' : 'var(--text-secondary)';
  });
}

// ── Submit Exam ───────────────────────────────────────────

function submitExam(container) {
  stopTimer();
  let correct = 0;
  const unitStats = {};

  examQs.forEach((q, i) => {
    const unitObj = syllabusUnits.find(u => u.id === q.unit) || { number: '', title: q.topic || 'General' };
    const uKey = q.unit || 'general';
    if (!unitStats[uKey]) {
      unitStats[uKey] = { title: `Unit ${unitObj.number}: ${unitObj.title}`, correct: 0, total: 0 };
    }
    unitStats[uKey].total++;

    if (userAnswers[i] === q.correct) {
      correct++;
      unitStats[uKey].correct++;
      removeMistake(q.id);
    } else if (userAnswers[i] !== null) {
      addMistake(q.id);
    }
  });

  score = correct;
  const percent = Math.round((correct / examQs.length) * 100);
  const elapsed = examStartTime ? Math.round((Date.now() - examStartTime) / 60000) : 0;

  // Record study time
  if (elapsed > 0) addStudySession(elapsed);

  saveResult({
    type: 'mock',
    score: correct,
    total: examQs.length,
    percent,
    mode: 'exam',
    timeTaken: elapsed,
    label: `Mock Exam (${examQs.length}Q)`,
  });
  updateStreak();
  const newBadges = checkAndAwardBadges(syllabusUnits);

  renderScorecard(container, correct, percent, elapsed, newBadges, unitStats);
}

// ── Scorecard ─────────────────────────────────────────────

function renderScorecard(container, correct, percent, elapsed, newBadges, unitStats = {}) {
  const grade = percent >= 90 ? 'A+' : percent >= 75 ? 'A' : percent >= 60 ? 'B' : percent >= 40 ? 'C' : 'D';
  const msg   = percent >= 90 ? '🎉 Outstanding Performance!' : percent >= 75 ? '🌟 Excellent Work!' : percent >= 60 ? '👍 Good Effort!' : percent >= 40 ? '📖 Needs More Practice' : '💪 Keep Going!';
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (percent / 100) * circumference;
  // Separate wrong from skipped so the scorecard is accurate
  const skipped = userAnswers.filter(a => a === null).length;
  const wrong   = examQs.length - correct - skipped;

  container.innerHTML = `
    <div class="scorecard animate-fadeIn" style="max-width:800px;margin:0 auto;">
      <div class="card" style="overflow:hidden;margin-bottom:1.5rem;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#5b21b6);padding:2.5rem;text-align:center;">
          <h2 style="color:#fff;margin-bottom:1rem;font-size:1.75rem;">${msg}</h2>
          <div style="display:inline-flex;align-items:center;justify-content:center;position:relative;">
            <svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg)">
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#22c55e"/>
                  <stop offset="100%" style="stop-color:#86efac"/>
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="8"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGrad)" stroke-width="8"
                stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                style="transition:stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)"/>
            </svg>
            <div style="position:absolute;text-align:center;">
              <div style="font-size:1.75rem;font-weight:900;color:#fff;">${percent}%</div>
              <div style="font-size:0.75rem;color:rgba(255,255,255,0.7);">Score</div>
            </div>
          </div>
          <div style="color:rgba(255,255,255,0.8);margin-top:1rem;font-size:1.25rem;font-weight:700;">
            Grade: ${grade}
          </div>
          ${newBadges.length > 0 ? `
          <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;">
            ${newBadges.map(b => `<span style="background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;font-size:0.8rem;color:#fff;">${b.icon} ${b.name}</span>`).join('')}
          </div>` : ''}
        </div>
        <div style="padding:1.5rem;">
          <div class="scorecard__stats" style="grid-template-columns:repeat(4,1fr);">
            <div class="scorecard__stat">
              <div class="scorecard__stat-value" style="color:var(--color-success);">${correct}</div>
              <div class="scorecard__stat-label">Correct</div>
            </div>
            <div class="scorecard__stat">
              <div class="scorecard__stat-value" style="color:var(--color-danger);">${wrong}</div>
              <div class="scorecard__stat-label">Wrong</div>
            </div>
            <div class="scorecard__stat">
              <div class="scorecard__stat-value" style="color:var(--text-muted);">${skipped}</div>
              <div class="scorecard__stat-label">Skipped</div>
            </div>
            <div class="scorecard__stat">
              <div class="scorecard__stat-value" style="color:var(--color-warning);">${elapsed}m</div>
              <div class="scorecard__stat-label">Time Taken</div>
            </div>
          </div>
          <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem;">
            <button class="btn btn--primary" onclick="window.location.reload()">🔄 Take Another Exam</button>
            <button class="btn btn--secondary" onclick="window.reviewExam()">📋 Review Answers</button>
            <a href="progress.html" class="btn btn--ghost">📊 View Progress</a>
          </div>
        </div>
      </div>

      <!-- Unit Weakness Breakdown Card -->
      ${Object.keys(unitStats).length > 0 ? `
        <div class="card" style="margin-bottom:1.5rem;padding:1.5rem;">
          <div class="section-title" style="margin-bottom:1rem;">📊 Unit-wise Performance Breakdown</div>
          <div style="display:flex;flex-direction:column;gap:0.85rem;">
            ${Object.values(unitStats).map(u => {
              const uPct = Math.round((u.correct / u.total) * 100);
              const barClass = uPct >= 75 ? 'progress-bar--success' : uPct >= 50 ? '' : 'progress-bar--danger';
              const badgeClass = uPct >= 75 ? 'badge--success' : uPct >= 50 ? 'badge--warning' : 'badge--danger';
              return `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem;">
                    <span style="font-weight:600;color:var(--text-primary);">${u.title}</span>
                    <span class="badge ${badgeClass}">${u.correct}/${u.total} (${uPct}%)</span>
                  </div>
                  <div class="progress-wrap progress-wrap--sm" style="width:100%;">
                    <div class="progress-bar ${barClass}" style="width:${uPct}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div id="review-section"></div>
    </div>
  `;

  window.reviewExam = () => renderReview(document.getElementById('review-section'));
}

// ── Answer Review ─────────────────────────────────────────

function renderReview(container) {
  const labels = ['A', 'B', 'C', 'D'];
  container.innerHTML = `
    <h3 style="margin-bottom:1.5rem;">📋 Detailed Review</h3>
    ${examQs.map((q, i) => {
      const ua = userAnswers[i];
      const isCorrect = ua === q.correct;
      const statusColor = ua === null ? 'var(--text-muted)' : isCorrect ? 'var(--color-success)' : 'var(--color-danger)';
      return `
        <div class="card" style="margin-bottom:1rem;padding:1.25rem;border-left:4px solid ${statusColor};">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
            <div class="question-number">Q${i+1}</div>
            <div style="display:flex;gap:0.5rem;">
              <span class="badge ${isCorrect ? 'badge--success' : ua === null ? 'badge--gray' : 'badge--danger'}">
                ${ua === null ? '⬜ Skipped' : isCorrect ? '✅ Correct' : '❌ Wrong'}
              </span>
            </div>
          </div>
          <p style="font-size:0.9rem;font-weight:600;color:var(--text-primary);margin-bottom:0.75rem;">${q.question}</p>
          <div style="font-size:0.8rem;display:flex;flex-direction:column;gap:0.25rem;">
            ${q.options.map((opt, oi) => {
              let bg = 'transparent', color = 'var(--text-secondary)', fw = 'normal';
              if (oi === q.correct) { bg = 'var(--color-success-bg)'; color = '#166534'; fw = '600'; }
              else if (oi === ua && !isCorrect) { bg = 'var(--color-danger-bg)'; color = '#b91c1c'; }
              return `<div style="padding:0.35rem 0.75rem;border-radius:6px;background:${bg};color:${color};font-weight:${fw};">
                ${labels[oi]}. ${opt} ${oi === q.correct ? ' ✓' : oi === ua && !isCorrect ? ' ✗' : ''}
              </div>`;
            }).join('')}
          </div>
          <div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg-surface-2);border-radius:8px;font-size:0.8rem;color:var(--text-secondary);">
            💡 ${q.explanation}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ── Results History ───────────────────────────────────────

function renderResultsHistory(container) {
  if (!container) return;
  try {
    // Use the storage abstraction — respects STORAGE_KEYS, not a hardcoded key string
    const results = getRecentResults(5);
    if (results.length === 0) return;
    container.innerHTML = `
      <div class="card">
        <div class="section-header">
          <div class="section-title" style="font-size:1rem;">📈 Recent Exam History</div>
        </div>
        <table class="results-table">
          <thead><tr>
            <th>Type</th><th>Score</th><th>Percent</th><th>Date</th>
          </tr></thead>
          <tbody>
            ${results.map(r => `<tr>
              <td>${r.label || r.type}</td>
              <td>${r.score}/${r.total}</td>
              <td><span class="badge ${r.percent >= 75 ? 'badge--success' : r.percent >= 50 ? 'badge--warning' : 'badge--danger'}">${r.percent}%</span></td>
              <td style="font-size:0.8rem;color:var(--text-muted);">${new Date(r.date).toLocaleDateString('en-IN')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch {}
}

export { initExam };
