/**
 * practice.js — Practice mode module
 * Bihar STET 2026 CS Prep App
 */

import { fetchJSON, showToast, animateCounter, addSwipeListener, showSwipeHint } from './app.js';

import {
  saveResult, updateStreak, setTopicStatus, getTopicStatus,
  checkAndAwardBadges, addMistake, removeMistake, getMistakes,
  getBookmarks, isBookmarked, toggleBookmark, addStudySession,
} from './storage.js';

let allQuestions  = [];
let syllabusUnits = [];
let sessionQs     = [];
let userChoices   = [];
let currentIndex  = 0;
let score         = 0;
let mode          = 'practice'; // 'practice' | 'exam'
let answered      = false;
let _practiceKeyHandler = null; // named handler so it can be removed on filter changes
let sessionStartTime    = null; // tracks when current session started

// ── Init ──────────────────────────────────────────────────

async function initPractice() {
  const container = document.getElementById('practice-app');
  if (!container) return;

  try {
    container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading questions…</span></div>`;
    const [qData, sData] = await Promise.all([
      fetchJSON('./data/questions.json'),
      fetchJSON('./data/syllabus.json'),
    ]);
    allQuestions  = qData.questions;
    syllabusUnits = sData.units;

    // Read URL params for pre-selected unit/topic
    const params  = new URLSearchParams(window.location.search);
    const unitParam  = params.get('unit')  || '';
    const topicParam = params.get('topic') || '';

    renderSetupScreen(container, unitParam, topicParam);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon">⚠️</div>
      <div class="empty-state__title">Failed to load questions</div>
      <p>Please run through a local server (e.g., <code>npx serve</code>).</p>
    </div>`;
    console.error(err);
  }
}

// ── Setup Screen ──────────────────────────────────────────

function renderSetupScreen(container, preUnit = '', preTopic = '') {
  const mistakesCount = getMistakes().length;
  const bookmarksCount = getBookmarks().length;

  const unitOptions = syllabusUnits.map(u =>
    `<option value="${u.id}" ${u.id === preUnit ? 'selected' : ''}>Unit ${u.number}: ${u.title}</option>`
  ).join('');

  container.innerHTML = `
    <div class="quiz-container animate-fadeIn">
      <div class="card" style="margin-bottom:2rem; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#4f46e5);padding:2rem;border-radius:inherit;">
          <h2 style="color:#fff;margin-bottom:0.5rem;">📝 Practice Questions</h2>
          <p style="color:rgba(255,255,255,0.75); font-size:0.95rem;">
            Choose a unit, topic, or practice special sets like your past mistakes & bookmarks.
          </p>
        </div>
        <div style="padding:1.5rem;">
          <div class="setup-form-grid">
            <div class="form-group">
              <label class="form-label" for="unit-select">📚 Select Category / Unit</label>
              <select id="unit-select" class="form-select">
                <option value="">All Units</option>
                <option value="special_mistakes" style="font-weight:700;color:var(--color-danger);">❌ Revise Mistakes (${mistakesCount})</option>
                <option value="special_bookmarks" style="font-weight:700;color:var(--color-warning);">⭐ Bookmarked Questions (${bookmarksCount})</option>
                <optgroup label="Syllabus Units">
                  ${unitOptions}
                </optgroup>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="topic-select">📌 Select Topic</label>
              <select id="topic-select" class="form-select">
                <option value="">All Topics</option>
              </select>
            </div>
          </div>

          <div class="setup-form-grid">
            <div class="form-group">
              <label class="form-label" for="diff-select">🎯 Difficulty</label>
              <select id="diff-select" class="form-select">
                <option value="">All Levels</option>
                <option value="easy">⭐ Easy</option>
                <option value="medium">⭐⭐ Medium</option>
                <option value="hard">⭐⭐⭐ Hard</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="count-select">🔢 Number of Questions</label>
              <select id="count-select" class="form-select">
                <option value="5">5 questions</option>
                <option value="10" selected>10 questions</option>
                <option value="20">20 questions</option>
                <option value="all">All available</option>
              </select>
            </div>
          </div>

          <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center;">
            <div class="form-group" style="flex:1;min-width:140px;">
              <label class="form-label">🎮 Mode</label>
              <div style="display:flex;gap:1rem;margin-top:0.25rem;">
                <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.875rem;cursor:pointer;">
                  <input type="radio" name="mode" value="practice" checked> Practice (Instant Feedback)
                </label>
                <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.875rem;cursor:pointer;">
                  <input type="radio" name="mode" value="exam"> Exam (Self-Submit)
                </label>
              </div>
            </div>
          </div>

          <div id="question-count-info" style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1rem;">
            ${allQuestions.length} questions available
          </div>

          <button id="start-btn" class="btn btn--primary btn--lg btn--full" onclick="window.startPractice()">
            🚀 Start Practice
          </button>
        </div>
      </div>

      <div class="card">
        <div class="section-header" style="margin-bottom:1rem;">
          <div>
            <div class="section-title" style="font-size:1rem;">📊 Topic Completion Status</div>
          </div>
        </div>
        <div id="topic-status-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;">
          ${renderTopicStatusGrid()}
        </div>
      </div>
    </div>
  `;

  const unitSelect  = document.getElementById('unit-select');
  const topicSelect = document.getElementById('topic-select');
  const diffSelect  = document.getElementById('diff-select');

  function populateTopics(selectedUnitId, selectedTopicId = '') {
    topicSelect.innerHTML = '<option value="">All Topics</option>';
    if (!selectedUnitId || selectedUnitId.startsWith('special_')) return;
    const targetUnit = syllabusUnits.find(u => u.id === selectedUnitId);
    if (!targetUnit) return;
    targetUnit.topics.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      if (t.id === selectedTopicId) opt.selected = true;
      topicSelect.appendChild(opt);
    });
  }

  unitSelect.addEventListener('change', () => {
    populateTopics(unitSelect.value);
    updateQuestionCount();
  });
  topicSelect.addEventListener('change', updateQuestionCount);
  diffSelect.addEventListener('change', updateQuestionCount);

  if (preUnit) {
    populateTopics(preUnit, preTopic);
    updateQuestionCount();
  }

  window.startPractice = () => startSession(container);
}

function renderTopicStatusGrid() {
  return syllabusUnits.map(u => {
    // Aggregate across ALL topics in the unit (not just topics[0])
    const allDone    = u.topics.length > 0 && u.topics.every(t => getTopicStatus(t.id) === 'done');
    const anyStarted = u.topics.some(t => getTopicStatus(t.id) !== 'not-started');
    const status = allDone ? 'done' : anyStarted ? 'in-progress' : 'not-started';
    const statusColor = status === 'done' ? 'var(--color-success)' : status === 'in-progress' ? 'var(--color-warning)' : 'var(--text-muted)';
    const statusIcon  = status === 'done' ? '✓' : status === 'in-progress' ? '●' : '○';
    return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:var(--bg-surface-2);border-radius:0.5rem;font-size:0.8rem;">
      <span style="color:${statusColor};font-weight:700;flex-shrink:0;">${statusIcon}</span>
      <span>${u.icon}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Unit ${u.number}: ${u.title}</span>
    </div>`;
  }).join('');
}

function updateQuestionCount() {
  const unit = document.getElementById('unit-select').value;
  const topicId = document.getElementById('topic-select').value;
  const diff = document.getElementById('diff-select').value;
  let qs = filterQuestions(unit, diff, topicId);
  const el = document.getElementById('question-count-info');
  if (el) el.textContent = `${qs.length} question${qs.length !== 1 ? 's' : ''} available`;
}

function filterQuestions(unit, difficulty, topicId = '') {
  if (unit === 'special_mistakes') {
    const mistakeIds = getMistakes();
    return allQuestions.filter(q => mistakeIds.includes(q.id));
  }
  if (unit === 'special_bookmarks') {
    const bookmarkIds = getBookmarks();
    return allQuestions.filter(q => bookmarkIds.includes(q.id));
  }
  return allQuestions.filter(q => {
    if (unit && q.unit !== unit) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    if (topicId && q.topicId !== topicId) return false;
    return true;
  });
}

// ── Start Session ─────────────────────────────────────────

function startSession(container) {
  const unit    = document.getElementById('unit-select').value;
  const topicId = document.getElementById('topic-select').value;
  const diff    = document.getElementById('diff-select').value;
  const count   = document.getElementById('count-select').value;
  mode = document.querySelector('input[name="mode"]:checked')?.value || 'practice';

  let questions = filterQuestions(unit, diff, topicId);
  if (questions.length === 0) {
    showToast('No questions match your filters. Try different settings.', 'warning');
    return;
  }

  // Shuffle
  questions = questions.sort(() => Math.random() - 0.5);
  sessionQs    = count === 'all' ? questions : questions.slice(0, parseInt(count));
  userChoices  = new Array(sessionQs.length).fill(null);
  currentIndex = 0;
  score        = 0;
  answered     = false;
  sessionStartTime = Date.now(); // record session start for study time tracking

  setupKeyboardShortcuts(container);
  renderQuestion(container);
}

// ── Keyboard Shortcuts ───────────────────────────────────

function setupKeyboardShortcuts(container) {
  // Remove any existing handler before attaching a fresh one
  if (_practiceKeyHandler) {
    window.removeEventListener('keydown', _practiceKeyHandler);
  }
  _practiceKeyHandler = (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (!sessionQs.length || currentIndex >= sessionQs.length) return;

    const q = sessionQs[currentIndex];
    const key = e.key.toLowerCase();
    if (['1', 'a'].includes(key)) triggerOption(0, q, container);
    else if (['2', 'b'].includes(key)) triggerOption(1, q, container);
    else if (['3', 'c'].includes(key)) triggerOption(2, q, container);
    else if (['4', 'd'].includes(key)) triggerOption(3, q, container);
    else if (key === 'enter' || key === 'arrowright') {
      if (mode === 'practice' && answered) {
        currentIndex++;
        renderQuestion(container);
      } else if (mode === 'exam') {
        window.submitExamAnswer();
      }
    }
  };
  window.addEventListener('keydown', _practiceKeyHandler);
}

function triggerOption(idx, q, container) {
  const optEl = container.querySelector(`.option-item[data-index="${idx}"]`);
  if (optEl && !(answered && mode === 'practice')) {
    selectOption(optEl, q, container);
  }
}

// ── Render Question ───────────────────────────────────────

function renderQuestion(container) {
  if (currentIndex >= sessionQs.length) {
    renderResults(container);
    return;
  }

  const q = sessionQs[currentIndex];
  answered = false;

  const labels = ['A', 'B', 'C', 'D'];
  const diffBadge = { easy: 'badge--success', medium: 'badge--warning', hard: 'badge--danger' };
  const bookmarked = isBookmarked(q.id);

  container.innerHTML = `
    <div class="quiz-container animate-fadeIn">
      <div class="quiz-header">
        <div>
          <div class="quiz-counter">Question ${currentIndex+1} of ${sessionQs.length} <span style="font-size:0.7rem;color:var(--text-muted);">(Use 1-4 or A-D keys)</span></div>
          <div class="progress-wrap" style="width:200px;margin-top:0.5rem;">
            <div class="progress-bar" style="width:${((currentIndex)/sessionQs.length)*100}%"></div>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <button onclick="window.toggleQuestionBookmark('${q.id}')" class="btn btn--sm btn--ghost"
            style="${bookmarked ? 'color:var(--color-warning);border-color:var(--color-warning);' : ''}">
            ${bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
          <span class="badge ${diffBadge[q.difficulty]||'badge--gray'}">${q.difficulty}</span>
          <span class="badge badge--primary">Score: ${score}/${currentIndex + 1}</span>
          ${mode === 'practice' ? '' : '<span class="badge badge--warning">Exam Mode</span>'}
        </div>
      </div>

      <div class="question-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
          <div class="question-number">Q${currentIndex+1}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Unit: ${q.topic}</div>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-list" id="options-list">
          ${q.options.map((opt, i) => `
            <div class="option-item" data-index="${i}" role="button" tabindex="0"
              aria-label="Option ${labels[i]}: ${opt}">
              <div class="option-marker">${labels[i]}</div>
              <div class="option-text">${opt}</div>
            </div>
          `).join('')}
        </div>
        <div id="explanation" style="display:none;"></div>
      </div>

      <div style="display:flex;gap:0.75rem;justify-content:space-between;align-items:center;">
        <button class="btn btn--ghost" onclick="window.skipQuestion()">Skip →</button>
        <div style="display:flex;gap:0.75rem;">
          <button class="btn btn--secondary" onclick="window.showSetup()">⬅ Change Filters</button>
          ${mode === 'practice' ? '' : `<button id="submit-exam-btn" class="btn btn--primary" onclick="window.submitExamAnswer()">Submit Answer</button>`}
        </div>
      </div>
    </div>
  `;

  // Option click handlers
  container.querySelectorAll('.option-item').forEach(optEl => {
    optEl.addEventListener('click', () => {
      if (answered && mode === 'practice') return;
      selectOption(optEl, q, container);
    });
    optEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !(answered && mode === 'practice')) selectOption(optEl, q, container);
    });
  });

  // Attach touch swipe gesture listener to outer container (not just the card)
  // Left swipe = next question (after answering in practice, or always in exam)
  // Right swipe = previous question (always, when index > 0)
  const swipeZone = container.querySelector('.quiz-container') || container;
  addSwipeListener(swipeZone,
    () => {
      // Left swipe: next question
      if (mode === 'practice' && answered && currentIndex + 1 < sessionQs.length) {
        currentIndex++;
        renderQuestion(container);
      } else if (mode === 'exam' && currentIndex + 1 < sessionQs.length) {
        currentIndex++;
        renderQuestion(container);
      }
    },
    () => {
      // Right swipe: previous question
      if (currentIndex > 0) {
        currentIndex--;
        // Restore answered state based on whether user actually chose an answer for this question
        // (not mode-dependent — was incorrectly 'true' for practice mode, locking unanswered questions)
        answered = userChoices[currentIndex] !== null && userChoices[currentIndex] !== undefined;
        renderQuestion(container);
      }
    }
  );
  showSwipeHint();

  // Global callbacks
  window.skipQuestion = () => { currentIndex++; renderQuestion(container); };
  window.showSetup    = () => renderSetupScreen(container);
  window.toggleQuestionBookmark = (qId) => {
    const isAdded = toggleBookmark(qId);
    showToast(isAdded ? '★ Question bookmarked!' : '☆ Bookmark removed', 'info');
    renderQuestion(container);
  };
  window.submitExamAnswer = () => {
    const selected = container.querySelector('.option-item.selected');
    if (!selected) { showToast('Please select an answer first.', 'warning'); return; }
    revealAnswer(parseInt(selected.dataset.index), q, container);
  };
}

function selectOption(optEl, q, container) {
  const optionsList = container.querySelector('.options-list');
  optionsList.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
  optEl.classList.add('selected');

  if (mode === 'practice') {
    revealAnswer(parseInt(optEl.dataset.index), q, container);
  }
}

function revealAnswer(selectedIdx, q, container) {
  answered = true;
  userChoices[currentIndex] = selectedIdx;
  const isCorrect = selectedIdx === q.correct;

  if (isCorrect) {
    score++;
    // Mistake pool updated at session end (renderResults) — not on each answer
    // to avoid clearing weak questions from a single lucky guess
  }

  const optionItems = container.querySelectorAll('.option-item');
  optionItems.forEach((el, i) => {
    el.style.pointerEvents = 'none';
    if (i === q.correct) el.classList.add('correct');
    else if (i === selectedIdx && !isCorrect) el.classList.add('incorrect');
  });

  // Explanation
  const expEl = document.getElementById('explanation');
  if (expEl) {
    expEl.style.display = 'block';
    expEl.innerHTML = `
      <div class="explanation-box" style="${isCorrect ? '' : 'background:linear-gradient(135deg,#fef2f2,#fee2e2);border-color:#fca5a5;color:#b91c1c;'}">
        <div class="explanation-title">${isCorrect ? '✅ Correct!' : '❌ Incorrect!'}</div>
        <div>${q.explanation}</div>
      </div>
    `;
  }

  // Auto advance button
  if (mode === 'practice') {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn--primary btn--full';
    nextBtn.style.marginTop = '1rem';
    nextBtn.textContent = currentIndex + 1 < sessionQs.length ? 'Next Question (Enter / →)' : 'See Results 🏁';
    nextBtn.onclick = () => { currentIndex++; renderQuestion(container); };
    container.querySelector('.question-card').appendChild(nextBtn);
  }
}

// ── Results Screen ────────────────────────────────────────

function renderResults(container) {
  const percent = Math.round((score / sessionQs.length) * 100);
  const grade = percent >= 90 ? 'A+' : percent >= 75 ? 'A' : percent >= 60 ? 'B' : percent >= 40 ? 'C' : 'D';
  const msg   = percent >= 90 ? '🎉 Outstanding!' : percent >= 75 ? '🌟 Great job!' : percent >= 60 ? '👍 Good effort!' : '📖 Keep studying!';
  const labels = ['A', 'B', 'C', 'D'];

  // Track study session time
  const elapsed = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : 0;
  if (elapsed > 0) addStudySession(elapsed);

  // Update mistake pool at session end (bulk, not per-answer)
  sessionQs.forEach((q, i) => {
    const choice = userChoices[i];
    if (choice === null || choice === undefined) return; // skipped — don't penalise
    if (choice === q.correct) removeMistake(q.id);
    else addMistake(q.id);
  });

  // Save result — always 'practice' type regardless of self-submit mode
  saveResult({
    type: 'practice',
    score,
    total: sessionQs.length,
    percent,
    mode,
    label: `Practice Session`,
  });
  updateStreak();
  const newBadges = checkAndAwardBadges(syllabusUnits);
  setTimeout(() => {
    newBadges.forEach(b => showToast(`🏆 Badge earned: ${b.name}!`, 'success', 4000));
  }, 500);

  // Separate skipped from incorrect for an accurate scorecard (mirrors exam.js fix)
  const skipped   = userChoices.filter(c => c === null || c === undefined).length;
  const incorrect = sessionQs.length - score - skipped;

  container.innerHTML = `
    <div class="scorecard animate-fadeIn">
      <div class="card card--gradient" style="margin-bottom:1.5rem;padding:2.5rem;text-align:center;">
        <div style="font-size:5rem;margin-bottom:0.5rem;">${percent >= 75 ? '🏆' : percent >= 50 ? '📝' : '📖'}</div>
        <h2 style="color:#fff;margin-bottom:0.5rem;">${msg}</h2>
        <div class="scorecard__grade">${grade}</div>
        <div style="color:rgba(255,255,255,0.75);font-size:1rem;">${percent}% Score</div>
      </div>

      <div class="scorecard__stats" style="grid-template-columns:repeat(4,1fr);">
        <div class="scorecard__stat">
          <div class="scorecard__stat-value" style="color:var(--color-success);">${score}</div>
          <div class="scorecard__stat-label">Correct</div>
        </div>
        <div class="scorecard__stat">
          <div class="scorecard__stat-value" style="color:var(--color-danger);">${incorrect}</div>
          <div class="scorecard__stat-label">Incorrect</div>
        </div>
        <div class="scorecard__stat">
          <div class="scorecard__stat-value" style="color:var(--text-muted);">${skipped}</div>
          <div class="scorecard__stat-label">Skipped</div>
        </div>
        <div class="scorecard__stat">
          <div class="scorecard__stat-value">${sessionQs.length}</div>
          <div class="scorecard__stat-label">Total</div>
        </div>
      </div>

      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem;">
        <button class="btn btn--primary" onclick="window.location.reload()">🔄 Practice Again</button>
        <a href="mock-exam.html" class="btn btn--secondary">📝 Take Mock Exam</a>
        <a href="progress.html" class="btn btn--ghost">📊 View Progress</a>
      </div>

      <div class="divider"></div>
      <h3 style="margin-bottom:1rem;">📋 Question Review</h3>
      ${sessionQs.map((q, i) => {
        const uChoice = userChoices[i];
        const isCorrect = uChoice === q.correct;
        const isSkipped = uChoice === null || uChoice === undefined;
        const statusBadge = isSkipped ? '<span class="badge badge--gray">Skipped</span>' :
                            isCorrect ? '<span class="badge badge--success">✓ Correct</span>' :
                            '<span class="badge badge--danger">✗ Incorrect</span>';

        return `<div class="card" style="margin-bottom:1rem;padding:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
            <span style="font-size:0.9rem;font-weight:700;">Q${i+1}. ${q.question}</span>
            <div style="display:flex;gap:0.5rem;">
              <span class="badge badge--primary">${q.topic}</span>
              ${statusBadge}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.35rem;margin-top:0.75rem;font-size:0.85rem;">
            <div>Your choice: ${isSkipped ? '<em>None</em>' : `<strong>${labels[uChoice]}. ${q.options[uChoice]}</strong>`}</div>
            <div>Correct answer: <strong style="color:var(--color-success);">${labels[q.correct]}. ${q.options[q.correct]}</strong></div>
          </div>
          <div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg-surface-2);border-radius:8px;font-size:0.8rem;color:var(--text-secondary);">
            💡 ${q.explanation}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

export { initPractice };
