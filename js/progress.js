import { fetchJSON, showToast, createProgressRing, animateCounter, formatDate, formatDuration, formatTime, showConfirmModal } from './app.js';

import {
  getProgress, getOverallProgress, getUnitProgress,
  getCurrentStreak, getStudyTime, getResults,
  getEarnedBadges, ALL_BADGES, calculateDailyTarget,
  getExamDate, setExamDate, exportUserData, importUserData,
  resetEverything, checkAndAwardBadges,
} from './storage.js';

let syllabusUnits = [];

// ── Init ──────────────────────────────────────────────────

async function initProgress() {
  const container = document.getElementById('progress-app');
  if (!container) return;

  try {
    container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading progress…</span></div>`;
    syllabusUnits = (await fetchJSON('./data/syllabus.json')).units;
    renderProgressDashboard(container);
  } catch {
    // Fallback without fetch (file:// mode)
    syllabusUnits = [];
    renderProgressDashboard(container);
  }
}

// ── Render Dashboard ──────────────────────────────────────

function renderProgressDashboard(container) {
  const progress = getProgress();
  const overall  = getOverallProgress(syllabusUnits);
  const unitProg = getUnitProgress(syllabusUnits);
  const streak   = getCurrentStreak();
  const studyTime = getStudyTime();
  const results  = getResults();
  const earned   = getEarnedBadges();
  const currentExamDate = getExamDate();
  const daily    = calculateDailyTarget(syllabusUnits);

  // Count stats
  let totalTopics = 0, doneTopics = 0, inProgressTopics = 0;
  syllabusUnits.forEach(u => {
    u.topics.forEach(t => {
      totalTopics++;
      const s = progress[t.id] || 'not-started';
      if (s === 'done') doneTopics++;
      else if (s === 'in-progress') inProgressTopics++;
    });
  });

  container.innerHTML = `
    <!-- Hero Stats Row -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.5rem;margin-bottom:2rem;">
      
      <!-- Overall Progress -->
      <div class="card" style="text-align:center;background:linear-gradient(135deg,#1e3a5f,#4338ca);color:#fff;grid-column:span 1;">
        <div style="display:inline-flex;align-items:center;justify-content:center;position:relative;margin-bottom:1rem;">
          ${createProgressRing(overall, 120, 10)}
          <div style="position:absolute;text-align:center;">
            <div id="overall-pct" style="font-size:2rem;font-weight:900;color:#fff;">0%</div>
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.7);">Complete</div>
          </div>
        </div>
        <div style="font-size:1rem;font-weight:700;color:#fff;">Overall Progress</div>
        <div style="font-size:0.8rem;color:rgba(255,255,255,0.65);margin-top:0.25rem;">${doneTopics} of ${totalTopics} topics done</div>
      </div>

      <!-- Streak -->
      <div class="streak-card" style="flex-direction:column;align-items:center;text-align:center;">
        <div class="streak-flame">🔥</div>
        <div class="streak-count" id="streak-count">0</div>
        <div class="streak-label">Day Streak</div>
        ${streak === 0 ? '<div style="font-size:0.75rem;opacity:0.8;margin-top:0.25rem;">Study today to start!</div>' : ''}
      </div>

      <!-- Daily Target & Exam Date -->
      <div class="card" style="text-align:center;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:2.5rem;margin-bottom:0.25rem;">🎯</div>
        <div style="font-size:2rem;font-weight:900;color:var(--color-primary-600);" id="daily-target">0</div>
        <div style="font-size:0.875rem;color:var(--text-muted);">Topics to study today</div>
        <div style="margin-top:0.75rem;display:flex;align-items:center;justify-content:center;gap:0.4rem;">
          <label for="exam-date-input" style="font-size:0.75rem;color:var(--text-muted);">Exam Date:</label>
          <input type="date" id="exam-date-input" value="${currentExamDate}" 
            style="font-size:0.75rem;padding:2px 6px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-surface-2);color:var(--text-primary);">
        </div>
      </div>

      <!-- Study Time -->
      <div class="stat-card" style="flex-direction:column;align-items:center;text-align:center;">
        <div class="stat-card__icon" style="background:#e0f2fe;">📚</div>
        <div style="margin-top:0.5rem;">
          <div class="stat-card__value">${formatDuration(studyTime.totalMinutes)}</div>
          <div class="stat-card__label">Total Study Time</div>
        </div>
      </div>
    </div>

    <!-- Unit-wise Progress -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="section-header">
        <div>
          <div class="section-title">📊 Unit-wise Progress</div>
          <div class="section-subtitle">Your progress across all 15 units</div>
        </div>
        <a href="syllabus.html" class="btn btn--sm btn--secondary">Open Syllabus</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;" id="unit-progress-list">
        ${syllabusUnits.length === 0 ?
          '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Load the app via a server to see unit progress.</p>' :
          syllabusUnits.map(u => {
            const up = unitProg[u.id] || { done: 0, total: u.topics.length, percent: 0 };
            return `
              <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--bg-surface-2);border-radius:10px;">
                <div style="width:36px;height:36px;border-radius:8px;background:${u.color}22;color:${u.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;">${u.icon}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);margin-bottom:0.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    Unit ${u.number}: ${u.title}
                  </div>
                  <div class="progress-wrap progress-wrap--sm" style="width:100%;">
                    <div class="progress-bar ${up.percent === 100 ? 'progress-bar--success' : ''}" style="width:${up.percent}%"></div>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-size:0.875rem;font-weight:700;color:var(--text-primary);">${up.percent}%</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);">${up.done}/${up.total}</div>
                </div>
                ${up.percent === 100 ? '<span class="badge badge--success">✓ Done</span>' : ''}
              </div>
            `;
          }).join('')
        }
      </div>
    </div>

    <!-- Badges & Achievements -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="section-header">
        <div>
          <div class="section-title">🏆 Achievements</div>
          <div class="section-subtitle">${earned.length} of ${ALL_BADGES.length} earned</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:1rem;">
        ${ALL_BADGES.map(b => {
          const isEarned = earned.includes(b.id);
          return `
            <div class="achievement-badge ${isEarned ? 'earned' : 'locked'}" title="${b.desc}">
              <div class="achievement-badge__icon">${b.icon}</div>
              <div class="achievement-badge__name">${b.name}</div>
              <div style="font-size:0.65rem;color:var(--text-muted);">${b.desc}</div>
              ${isEarned ? '<span class="badge badge--success" style="font-size:0.65rem;">Earned</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Results History -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div class="section-header">
        <div>
          <div class="section-title">📈 Exam History</div>
          <div class="section-subtitle">${results.length} sessions recorded</div>
        </div>
        <a href="mock-exam.html" class="btn btn--sm btn--primary">Take Mock Exam</a>
      </div>
      ${results.length === 0 ?
        `<div class="empty-state" style="padding:2rem;">
          <div class="empty-state__icon">📝</div>
          <div class="empty-state__title">No exams taken yet</div>
          <p>Complete a practice session or mock exam to see results here.</p>
        </div>` :
        `<div style="overflow-x:auto;">
          <table class="results-table">
            <thead><tr>
              <th>#</th><th>Type</th><th>Score</th><th>Percent</th><th>Date</th>
            </tr></thead>
            <tbody>
              ${results.slice(0,10).map((r, i) => `<tr>
                <td style="color:var(--text-muted);">${i+1}</td>
                <td><span class="badge ${r.type === 'mock' ? 'badge--primary' : 'badge--info'}">${r.type === 'mock' ? '📝 Mock' : '🎯 Practice'}</span></td>
                <td style="font-weight:600;">${r.score}/${r.total}</td>
                <td><span class="badge ${r.percent >= 75 ? 'badge--success' : r.percent >= 50 ? 'badge--warning' : 'badge--danger'}">${r.percent}%</span></td>
                <td style="font-size:0.8rem;color:var(--text-muted);">${new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`
      }
    </div>

    <!-- Data Management & Danger Zone -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem;margin-bottom:1.5rem;">
      <div class="card">
        <div class="section-title" style="margin-bottom:0.5rem;">💾 Backup & Restore</div>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1rem;">
          Export your study history, badges, and progress to a JSON backup file or restore from a saved file.
        </p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button class="btn btn--secondary btn--sm" onclick="window.exportBackup()">📥 Export Progress</button>
          <button class="btn btn--ghost btn--sm" onclick="document.getElementById('import-file-input').click()">📤 Import Progress</button>
          <input type="file" id="import-file-input" accept=".json" style="display:none;" onchange="window.importBackup(event)">
        </div>
      </div>

      <div class="card" style="border-color:var(--color-danger);border-width:2px;">
        <div class="section-title" style="color:var(--color-danger);margin-bottom:0.5rem;">⚠️ Danger Zone</div>
        <p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1rem;">
          Reset all your progress, results, streaks and badges. This action cannot be undone.
        </p>
        <button class="btn btn--danger btn--sm" onclick="window.confirmReset()">🗑️ Reset All Progress</button>
      </div>
    </div>
  `;

  // Animate counters
  const overallEl = container.querySelector('#overall-pct');
  if (overallEl) animateCounter(overallEl, overall, 1000, '%');
  // Note: the suffix param handles the '%' — do NOT overwrite textContent immediately here

  const streakEl = container.querySelector('#streak-count');
  if (streakEl) animateCounter(streakEl, streak, 800);

  const dailyEl = container.querySelector('#daily-target');
  if (dailyEl) animateCounter(dailyEl, daily, 600);

  // Exam date change handler
  const dateInput = container.querySelector('#exam-date-input');
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected) {
        // Validate that the chosen date is actually in the future
        const selectedDate = new Date(selected);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate <= today) {
          showToast('⚠️ Exam date must be set in the future!', 'warning');
          e.target.value = getExamDate(); // revert to previous valid value
          return;
        }
        setExamDate(selected);
        showToast('🎯 Target exam date updated!', 'success');
        const updatedTarget = calculateDailyTarget(syllabusUnits, selected);
        if (dailyEl) animateCounter(dailyEl, updatedTarget, 400);
      }
    });
  }

  // Backup Export handler
  window.exportBackup = () => {
    const jsonStr = exportUserData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stet_2026_progress_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Progress backup exported successfully!', 'success');
  };

  // Backup Import handler
  window.importBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = importUserData(e.target.result);
      if (res.success) {
        showToast('✅ Progress imported successfully!', 'success');
        // Re-fetch syllabus before re-rendering so unit progress bars reflect the restored data
        setTimeout(async () => {
          try { syllabusUnits = (await fetchJSON('./data/syllabus.json')).units; } catch {}
          renderProgressDashboard(container);
        }, 1000);
      } else {
        showToast(`❌ Import failed: ${res.error}`, 'danger');
      }
    };
    reader.readAsText(file);
  };

  // Reset handler
  window.confirmReset = () => {
    showConfirmModal(
      'All progress, results, streaks and badges will be permanently deleted. This action cannot be undone.',
      '⚠️ Reset All Progress?',
      async () => {
        resetEverything();
        showToast('Progress reset successfully. Starting fresh!', 'info');
        // Re-fetch syllabus before re-rendering so unit bars reset cleanly from fresh data
        setTimeout(async () => {
          try { syllabusUnits = (await fetchJSON('./data/syllabus.json')).units; } catch {}
          renderProgressDashboard(container);
        }, 1000);
      },
      null,
      '🗑️ Reset Everything',
      'btn--danger'
    );
  };
}

export { initProgress };
