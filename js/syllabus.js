/**
 * syllabus.js — Syllabus Explorer module
 * Bihar STET 2026 CS Prep App
 */

import { fetchJSON, showToast, createProgressRing, animateCounter } from './app.js';
import {
  getProgress, setTopicStatus, getTopicStatus,
  getUnitProgress, updateStreak, checkAndAwardBadges,
  isSubtopicChecked, setSubtopicChecked,
} from './storage.js';

let syllabusData = null;
let activeTopic  = null;
let cachedMaterials = null; // cache materials.json after first fetch

// ── Smart URL builder for subtopics ──────────────────────

/**
 * Build the best study URL for a given subtopic.
 * Routes to GeeksforGeeks, YouTube, or a Google search
 * depending on the topic keywords.
 */
function buildSubtopicUrl(subtopic, unitTitle) {
  const s = subtopic.toLowerCase();

  // Video-first topics (conversions, visualizations, algorithms)
  const videoKeywords = [
    'conversion', 'convert', 'sort', 'sorting', 'visuali', 'animation',
    'tutorial', 'tower of hanoi', 'traversal', 'scheduling', 'simulation',
    'number system', 'k-map', 'kmap', 'karnaugh',
  ];
  const isVideoFirst = videoKeywords.some(k => s.includes(k));

  if (isVideoFirst) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(subtopic + ' ' + unitTitle + ' Computer Science')}`;
  }

  // Direct Google Search for GeeksforGeeks — 100% reliable, 0% 404 risk, opens current live GFG article
  return `https://www.google.com/search?q=${encodeURIComponent(subtopic + ' ' + unitTitle + ' GeeksforGeeks')}`;
}

// ── Main Init ─────────────────────────────────────────────

async function initSyllabus() {
  const treeEl   = document.getElementById('syllabus-tree');
  const panelEl  = document.getElementById('learning-panel');

  if (!treeEl) return;

  try {
    treeEl.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Loading syllabus…</span></div>`;
    syllabusData = await fetchJSON('./data/syllabus.json');
    renderTree(treeEl, syllabusData.units);
    updateSidebarProgress(syllabusData.units);
    // Notify the page that syllabus is ready — avoids a second syllabus.json fetch in the inline script
    window.dispatchEvent(new CustomEvent('stet-syllabus-loaded', { detail: { units: syllabusData.units } }));

    // Setup live search
    setupSearchFilter();

    // Open first unit by default
    const firstUnit = treeEl.querySelector('.unit-item');
    if (firstUnit) firstUnit.classList.add('open');

    // Select first topic by default if panel exists
    if (panelEl) {
      const firstTopic = treeEl.querySelector('.topic-item');
      if (firstTopic) firstTopic.click();
    }
  } catch (err) {
    treeEl.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon">⚠️</div>
      <div class="empty-state__title">Failed to load syllabus</div>
      <p>Please run the app through a local server (e.g., <code>npx serve</code>).</p>
    </div>`;
    console.error(err);
  }
}

function setupSearchFilter() {
  const searchInput = document.getElementById('tree-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.unit-item').forEach(unitEl => {
      let hasMatch = false;
      const unitTitle = unitEl.querySelector('.unit-title')?.textContent.toLowerCase() || '';
      if (q && unitTitle.includes(q)) hasMatch = true;

      unitEl.querySelectorAll('.topic-item').forEach(tEl => {
        const tTitle = tEl.querySelector('.topic-name')?.textContent.toLowerCase() || '';
        if (!q || tTitle.includes(q) || unitTitle.includes(q)) {
          tEl.style.display = 'flex';
          if (q && tTitle.includes(q)) hasMatch = true;
        } else {
          tEl.style.display = 'none';
        }
      });

      if (!q) {
        unitEl.style.display = 'block';
      } else if (hasMatch) {
        unitEl.style.display = 'block';
        unitEl.classList.add('open');
      } else {
        unitEl.style.display = 'none';
      }
    });
  });
}

// ── Render Tree ───────────────────────────────────────────

function renderTree(container, units) {
  const progress = getProgress();
  container.innerHTML = '';

  units.forEach(unit => {
    const unitProgress = getUnitProgressForUnit(unit, progress);
    const item = document.createElement('div');
    item.className = 'unit-item animate-fadeIn';
    item.dataset.unitId = unit.id;

    item.innerHTML = `
      <div class="unit-header" role="button" tabindex="0" aria-expanded="false" id="unit-${unit.id}">
        <div class="unit-icon" style="background: ${unit.color}22; color: ${unit.color}">
          ${unit.icon}
        </div>
        <div class="unit-title" title="Unit ${unit.number}: ${unit.title}">Unit ${unit.number}: ${unit.title}</div>
        <div class="unit-meta">
          <div class="unit-progress-mini">
            <div class="bar">
              <div class="bar-fill" style="width:${unitProgress.percent}%"></div>
            </div>
            <span>${unitProgress.done}/${unitProgress.total}</span>
          </div>
          <span class="unit-chevron">›</span>
        </div>
      </div>
      <div class="topics-list" role="list" aria-labelledby="unit-${unit.id}">
        ${unit.topics.map(topic => renderTopicItem(topic, progress)).join('')}
      </div>
    `;

    // Toggle unit open/close
    const header = item.querySelector('.unit-header');
    header.addEventListener('click', () => toggleUnit(item));
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleUnit(item); }
    });

    // Topic click handlers
    item.querySelectorAll('.topic-item').forEach(topicEl => {
      topicEl.addEventListener('click', () => selectTopic(topicEl, unit, units));
      topicEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') selectTopic(topicEl, unit, units);
      });
    });

    container.appendChild(item);
  });
}

function renderTopicItem(topic, progress) {
  const status = progress[topic.id] || 'not-started';
  const statusClass = status === 'done' ? 'done' : status === 'in-progress' ? 'in-progress' : '';
  const statusIcon  = status === 'done' ? '✓' : status === 'in-progress' ? '…' : '';
  return `
    <div class="topic-item" role="listitem button" tabindex="0" data-topic-id="${topic.id}">
      <div class="topic-status ${statusClass}" aria-label="${status}">${statusIcon}</div>
      <span class="topic-name">${topic.title}</span>
      <span class="badge badge--${
        status === 'done' ? 'success' : status === 'in-progress' ? 'warning' : 'gray'
      }" style="font-size:0.65rem;">${
        status === 'done' ? '✓ Done' : status === 'in-progress' ? 'In Progress' : 'Not Started'
      }</span>
    </div>
  `;
}

function getUnitProgressForUnit(unit, progress) {
  let done = 0;
  unit.topics.forEach(t => { if (progress[t.id] === 'done') done++; });
  return { done, total: unit.topics.length, percent: unit.topics.length ? Math.round(done/unit.topics.length*100) : 0 };
}

// ── Toggle Unit ───────────────────────────────────────────

function toggleUnit(unitItem) {
  const isOpen = unitItem.classList.contains('open');
  unitItem.classList.toggle('open', !isOpen);
  const header = unitItem.querySelector('.unit-header');
  header.setAttribute('aria-expanded', String(!isOpen));
}

// ── Select Topic ──────────────────────────────────────────

function selectTopic(topicEl, unit, allUnits) {
  const topicId = topicEl.dataset.topicId;
  const topic = unit.topics.find(t => t.id === topicId);
  if (!topic) return;

  // Deselect previous
  document.querySelectorAll('.topic-item.active').forEach(el => el.classList.remove('active'));
  topicEl.classList.add('active');
  activeTopic = { topic, unit };

  renderLearningPanel(topic, unit, allUnits);

  // Auto-scroll to learning panel on mobile viewports
  if (window.innerWidth < 900) {
    const panel = document.getElementById('learning-panel');
    if (panel) {
      // Use offset to avoid scrolling behind the sticky navbar (64px + buffer)
      const top = panel.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }
}

// ── Learning Panel ────────────────────────────────────────

function renderLearningPanel(topic, unit, allUnits) {
  const panel = document.getElementById('learning-panel');
  if (!panel) return;

  const status = getTopicStatus(topic.id);
  const isMobile = window.innerWidth < 900;

  panel.innerHTML = `
    ${isMobile ? `
      <div style="margin-bottom:0.75rem;">
        <button class="btn btn--sm btn--ghost" onclick="
          const sidebar = document.querySelector('.syllabus-sidebar');
          if (sidebar) { const top = sidebar.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({top, behavior:'smooth'}); }
        ">
          &#8593; Back to Syllabus Tree
        </button>
      </div>
    ` : ''}
    <div class="learning-panel__header">
      <div class="learning-panel__unit">Unit ${unit.number}: ${unit.title}</div>
      <div class="learning-panel__title">${topic.title}</div>
      <div style="margin-top:0.75rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
        <span class="badge ${status === 'done' ? 'badge--success' : status === 'in-progress' ? 'badge--warning' : 'badge--gray'}">
          ${status === 'done' ? '✓ Completed' : status === 'in-progress' ? '⏳ In Progress' : '○ Not Started'}
        </span>
        <span class="badge badge--gray">~${unit.estimatedHours ? Math.ceil(unit.estimatedHours / unit.topics.length) : 2}h estimated</span>
      </div>
    </div>
    <div class="learning-panel__body">

      <div class="panel-section-title">📋 Sub-topics Checklist <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted);">(check to track progress)</span></div>
      <ul class="subtopic-list">
        ${topic.subtopics.map((s, idx) => {
          const searchUrl = buildSubtopicUrl(s, unit.title);
          const checked = isSubtopicChecked(topic.id, idx);
          return `<li class="subtopic-item subtopic-item--link" style="display:flex;align-items:center;gap:0.75rem;">
            <input type="checkbox" ${checked ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;accent-color:var(--color-primary-600);"
              onclick="event.stopPropagation(); window.toggleSubtopicCheck('${topic.id}', ${idx}, this.checked)"
              title="Mark subtopic complete">
            <span style="flex:1;cursor:pointer;${checked ? 'text-decoration:line-through;opacity:0.7;' : ''}"
              onclick="window.open('${searchUrl}','_blank','noopener')"
              title="Click to search study material">${s}</span>
            <span class="subtopic-link-icon" style="cursor:pointer;" onclick="window.open('${searchUrl}','_blank','noopener')">↗</span>
          </li>`;
        }).join('')}
      </ul>

      <div class="panel-section-title">📚 Study Materials</div>
      <div id="panel-materials">
        <div class="loading-overlay" style="padding:1rem;"><div class="spinner"></div></div>
      </div>

      <div class="divider"></div>

      <div class="panel-section-title">✅ Mark Progress</div>
      <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1.5rem;">
        <button class="btn btn--sm btn--ghost ${status === 'not-started' ? 'btn--primary' : ''}" 
          onclick="window.setTopicProgress('${topic.id}', 'not-started', '${allUnits ? 'true' : 'false'}')">
          ○ Not Started
        </button>
        <button class="btn btn--sm btn--warning ${status === 'in-progress' ? '' : ''}" 
          onclick="window.setTopicProgress('${topic.id}', 'in-progress', 'true')">
          ⏳ In Progress
        </button>
        <button class="btn btn--sm btn--success" 
          onclick="window.setTopicProgress('${topic.id}', 'done', 'true')">
          ✓ Mark Complete
        </button>
      </div>

      <div class="panel-section-title">🎯 Practice</div>
      <a href="practice.html?unit=${unit.id}&topic=${topic.id}" class="btn btn--primary btn--full">
        📝 Practice Questions for this Topic
      </a>
    </div>
  `;

  // Load materials for this topic
  loadPanelMaterials(topic.id, unit.id);

  // Subtopic toggle callback
  window.toggleSubtopicCheck = (topicId, idx, isChecked) => {
    setSubtopicChecked(topicId, idx, isChecked);
    let checkedCount = 0;
    topic.subtopics.forEach((_, i) => {
      if (isSubtopicChecked(topicId, i)) checkedCount++;
    });

    let newStatus;
    if (checkedCount === topic.subtopics.length && topic.subtopics.length > 0) {
      newStatus = 'done';
    } else if (checkedCount > 0) {
      newStatus = 'in-progress';
    } else {
      newStatus = 'not-started'; // all subtopics unchecked — revert fully
    }
    setTopicStatus(topicId, newStatus);
    updateStreak();

    if (syllabusData) {
      const newBadges = checkAndAwardBadges(syllabusData.units);
      newBadges.forEach(b => showToast(`🏆 Badge earned: ${b.name}!`, 'success', 4000));
    }

    refreshTreeItem(topicId, newStatus);
    updateSidebarProgress(syllabusData?.units);
    window.dispatchEvent(new CustomEvent('stet-progress-changed')); // live-refresh top bar
    renderLearningPanel(topic, unit, allUnits);
  };

  // Expose callback for inline onclick
  window.setTopicProgress = (topicId, newStatus, refresh) => {
    setTopicStatus(topicId, newStatus);
    updateStreak();

    // Award badges
    if (syllabusData) {
      const newBadges = checkAndAwardBadges(syllabusData.units);
      newBadges.forEach(b => showToast(`🏆 Badge earned: ${b.name}!`, 'success', 4000));
    }

    showToast(newStatus === 'done' ? '✅ Topic marked as complete!' : '📌 Progress updated', 'success');
    refreshTreeItem(topicId, newStatus);
    updateSidebarProgress(syllabusData?.units);
    window.dispatchEvent(new CustomEvent('stet-progress-changed')); // live-refresh top bar

    // Re-render panel header badge
    const badgeEl = panel.querySelector('.learning-panel__header .badge:first-child');
    if (badgeEl) {
      badgeEl.className = `badge ${newStatus === 'done' ? 'badge--success' : newStatus === 'in-progress' ? 'badge--warning' : 'badge--gray'}`;
      badgeEl.textContent = newStatus === 'done' ? '✓ Completed' : newStatus === 'in-progress' ? '⏳ In Progress' : '○ Not Started';
    }
  };
}

async function loadPanelMaterials(topicId, unitId) {
  const el = document.getElementById('panel-materials');
  if (!el) return;
  try {
    // Use cached data to avoid re-fetching materials.json on every topic click
    const data = cachedMaterials || (cachedMaterials = await fetchJSON('./data/materials.json'));
    const items = data.materials.filter(m => m.topicId === topicId || m.unit === unitId).slice(0, 4);
    if (items.length === 0) {
      el.innerHTML = `<p style="font-size:0.875rem; color:var(--text-muted);">No specific materials linked yet. Check the <a href="materials.html">Materials Hub</a>.</p>`;
      return;
    }
    const typeIcons = { notes: '📄', video: '▶️', pdf: '📕', practice: '📝' };
    const typeBgs   = { notes: '#f0f4ff', video: '#fef3c7', pdf: '#fce7e7', practice: '#e8f5e9' };
    el.innerHTML = items.map(m => `
      <a href="${m.url}" target="_blank" rel="noopener" class="material-card" style="margin-bottom:0.5rem;">
        <div class="material-card__icon" style="background:${typeBgs[m.type]||'#f0f4ff'}">
          ${typeIcons[m.type]||'📄'}
        </div>
        <div class="material-card__body">
          <div class="material-card__title">${m.title}</div>
          <div class="material-card__desc">${m.description}</div>
        </div>
        <span class="badge badge--${m.difficulty === 'easy' ? 'success' : m.difficulty === 'hard' ? 'danger' : 'warning'}" style="flex-shrink:0;">${m.difficulty}</span>
      </a>
    `).join('');
  } catch {
    el.innerHTML = `<p style="font-size:0.875rem; color:var(--text-muted);">Materials unavailable.</p>`;
  }
}

// ── Refresh single tree item ──────────────────────────────

function refreshTreeItem(topicId, newStatus) {
  const topicEl = document.querySelector(`.topic-item[data-topic-id="${topicId}"]`);
  if (!topicEl) return;

  const statusEl = topicEl.querySelector('.topic-status');
  const badgeEl  = topicEl.querySelector('.badge');

  statusEl.className = `topic-status ${newStatus === 'done' ? 'done' : newStatus === 'in-progress' ? 'in-progress' : ''}`;
  statusEl.textContent = newStatus === 'done' ? '✓' : newStatus === 'in-progress' ? '…' : '';
  badgeEl.className = `badge badge--${newStatus === 'done' ? 'success' : newStatus === 'in-progress' ? 'warning' : 'gray'}`;
  badgeEl.textContent = newStatus === 'done' ? '✓ Done' : newStatus === 'in-progress' ? 'In Progress' : 'Not Started';

  // Update unit mini-progress bar
  updateUnitMiniBar(topicEl);
}

function updateUnitMiniBar(topicEl) {
  const unitItem = topicEl.closest('.unit-item');
  if (!unitItem) return;
  const topics = unitItem.querySelectorAll('.topic-item');
  const done   = unitItem.querySelectorAll('.topic-status.done').length;
  const pct    = Math.round((done / topics.length) * 100);
  const barFill = unitItem.querySelector('.bar-fill');
  const counter = unitItem.querySelector('.unit-progress-mini span');
  if (barFill)  barFill.style.width = `${pct}%`;
  if (counter)  counter.textContent = `${done}/${topics.length}`;
}

// ── Sidebar overall progress ──────────────────────────────

function updateSidebarProgress(units) {
  if (!units) return;
  const progress  = getProgress();
  let total = 0, done = 0;
  units.forEach(u => u.topics.forEach(t => { total++; if (progress[t.id] === 'done') done++; }));
  const pct = total ? Math.round((done/total)*100) : 0;

  const progressEl = document.getElementById('sidebar-progress');
  if (progressEl) progressEl.textContent = `${pct}% complete`;

  const ringEl = document.getElementById('syllabus-progress-ring');
  if (ringEl) {
    ringEl.innerHTML = createProgressRing(pct, 80, 7);
    const label = document.createElement('div');
    label.className = 'progress-ring__label';
    label.innerHTML = `<span class="progress-ring__value" style="font-size:1rem;">${pct}%</span>`;
    ringEl.appendChild(label);
  }
}

export { initSyllabus };
