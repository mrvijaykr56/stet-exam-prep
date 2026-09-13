/**
 * storage.js — LocalStorage abstraction layer
 * Bihar STET 2026 CS Prep App
 */

const STORAGE_KEYS = {
  PROGRESS:    'stet_progress',
  RESULTS:     'stet_results',
  STREAK:      'stet_streak',
  LAST_STUDY:  'stet_last_study',
  STUDY_TIME:  'stet_study_time',
  PREFERENCES: 'stet_preferences',
  BADGES:      'stet_badges',
  DAILY_GOAL:  'stet_daily_goal',
  EXAM_DATE:   'stet_exam_date',
  MISTAKES:    'stet_mistakes',
  BOOKMARKS:   'stet_bookmarks',
  SUBTOPICS:   'stet_subtopics',
};

/** Check if localStorage is available */
function isStorageAvailable() {
  try {
    const test = '__stet_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = isStorageAvailable();

/** Generic get with default value */
function getItem(key, defaultValue = null) {
  if (!storageAvailable) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/** Generic set */
function setItem(key, value) {
  if (!storageAvailable) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('Storage write failed:', e);
    return false;
  }
}

/** Remove a key */
function removeItem(key) {
  if (!storageAvailable) return;
  try { localStorage.removeItem(key); } catch {}
}

// ── Progress ──────────────────────────────────────────────

/**
 * Get all topic progress.
 * Returns: { [topicId]: 'not-started' | 'in-progress' | 'done' }
 */
function getProgress() {
  return getItem(STORAGE_KEYS.PROGRESS, {});
}

/** Update status of a single topic */
function setTopicStatus(topicId, status) {
  const progress = getProgress();
  progress[topicId] = status;
  setItem(STORAGE_KEYS.PROGRESS, progress);
}

/** Get status of a topic */
function getTopicStatus(topicId) {
  return getProgress()[topicId] || 'not-started';
}

/**
 * Calculate overall completion percent given full syllabus data.
 * @param {Array} units - syllabus units array
 */
function getOverallProgress(units) {
  const progress = getProgress();
  let total = 0, done = 0;
  units.forEach(unit => {
    unit.topics.forEach(topic => {
      total++;
      if (progress[topic.id] === 'done') done++;
    });
  });
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/**
 * Calculate per-unit progress.
 * @returns {Object} { [unitId]: { total, done, percent } }
 */
function getUnitProgress(units) {
  const progress = getProgress();
  const result = {};
  units.forEach(unit => {
    let total = unit.topics.length, done = 0;
    unit.topics.forEach(topic => {
      if (progress[topic.id] === 'done') done++;
    });
    result[unit.id] = { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  });
  return result;
}

/** Reset all progress (with confirmation from caller) */
function resetAllProgress() {
  removeItem(STORAGE_KEYS.PROGRESS);
}

// ── Results ───────────────────────────────────────────────

/** Get results history array */
function getResults() {
  return getItem(STORAGE_KEYS.RESULTS, []);
}

/** Save a new exam/practice result */
function saveResult(result) {
  const results = getResults();
  results.unshift({ ...result, id: Date.now(), date: new Date().toISOString() });
  // Keep only last 50
  if (results.length > 50) results.length = 50;
  setItem(STORAGE_KEYS.RESULTS, results);
}

/** Get the 5 most recent results */
function getRecentResults(n = 5) {
  return getResults().slice(0, n);
}

// ── Streak ────────────────────────────────────────────────

function getStreakData() {
  return getItem(STORAGE_KEYS.STREAK, { count: 0, lastDate: null });
}

/**
 * Update streak based on today's study activity.
 * Call this when user completes any topic or practice.
 */
function updateStreak() {
  const today = new Date().toDateString();
  const data = getStreakData();

  if (data.lastDate === today) return data; // Already updated today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (data.lastDate === yesterday.toDateString()) {
    data.count += 1; // Continued streak
  } else if (data.lastDate !== today) {
    data.count = 1; // New or reset streak
  }

  data.lastDate = today;
  setItem(STORAGE_KEYS.STREAK, data);
  return data;
}

function getCurrentStreak() {
  const data = getStreakData();
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // If last activity wasn't today or yesterday, streak is 0
  if (data.lastDate !== today && data.lastDate !== yesterday.toDateString()) {
    return 0;
  }
  return data.count;
}

// ── Study Time ────────────────────────────────────────────

function getStudyTime() {
  return getItem(STORAGE_KEYS.STUDY_TIME, { totalMinutes: 0, sessions: [] });
}

function addStudySession(minutes) {
  const data = getStudyTime();
  data.totalMinutes += minutes;
  data.sessions.unshift({ minutes, date: new Date().toISOString() });
  if (data.sessions.length > 30) data.sessions.length = 30;
  setItem(STORAGE_KEYS.STUDY_TIME, data);
}

// ── Preferences ───────────────────────────────────────────

function getPreferences() {
  return getItem(STORAGE_KEYS.PREFERENCES, {
    theme: 'light',
    notifications: false,
    dailyGoalTopics: 3,
  });
}

function setPreference(key, value) {
  const prefs = getPreferences();
  prefs[key] = value;
  setItem(STORAGE_KEYS.PREFERENCES, prefs);
}

// ── Badges ────────────────────────────────────────────────

const ALL_BADGES = [
  { id: 'first_topic', icon: '🌱', name: 'First Step', desc: 'Complete your first topic' },
  { id: 'streak_3',   icon: '🔥', name: '3-Day Streak', desc: '3 days in a row' },
  { id: 'streak_7',   icon: '⚡', name: 'Week Warrior', desc: '7-day study streak' },
  { id: 'streak_30',  icon: '🏆', name: 'Month Master', desc: '30-day study streak' },
  { id: 'unit_done',  icon: '🎯', name: 'Unit Completer', desc: 'Complete an entire unit' },
  { id: 'mock_first', icon: '📝', name: 'Test Taker', desc: 'Complete your first mock exam' },
  { id: 'mock_90',    icon: '💎', name: 'Mock Master', desc: 'Score 90%+ in a mock exam' },
  { id: 'half_done',  icon: '⭐', name: 'Halfway Hero', desc: '50% syllabus completed' },
  { id: 'all_done',   icon: '🎓', name: 'STET Ready', desc: '100% syllabus completed' },
];

function getEarnedBadges() {
  return getItem(STORAGE_KEYS.BADGES, []);
}

function awardBadge(badgeId) {
  const earned = getEarnedBadges();
  if (!earned.includes(badgeId)) {
    earned.push(badgeId);
    setItem(STORAGE_KEYS.BADGES, earned);
    return true; // newly awarded
  }
  return false;
}

function checkAndAwardBadges(units) {
  const progress = getProgress();
  const streak = getCurrentStreak();
  const results = getResults();
  const newBadges = [];
  // Guard: if syllabus data wasn't loaded (e.g., network error), skip unit-dependent badges
  // rather than silently awarding 0% for all of them
  const hasUnits = Array.isArray(units) && units.length > 0;

  // First topic done (doesn't require syllabus data)
  const anyDone = Object.values(progress).some(s => s === 'done');
  if (anyDone && awardBadge('first_topic')) newBadges.push('first_topic');

  // Streak badges (don't require syllabus data)
  if (streak >= 3  && awardBadge('streak_3'))  newBadges.push('streak_3');
  if (streak >= 7  && awardBadge('streak_7'))  newBadges.push('streak_7');
  if (streak >= 30 && awardBadge('streak_30')) newBadges.push('streak_30');

  // Syllabus-dependent badges — only evaluate when units data is available
  if (hasUnits) {
    const overallPct = getOverallProgress(units);
    if (overallPct >= 50  && awardBadge('half_done')) newBadges.push('half_done');
    if (overallPct >= 100 && awardBadge('all_done'))  newBadges.push('all_done');

    const unitProg = getUnitProgress(units);
    const anyUnitDone = Object.values(unitProg).some(u => u.percent === 100);
    if (anyUnitDone && awardBadge('unit_done')) newBadges.push('unit_done');
  }

  // Mock exams — only award based on genuine mock exam results (type:'mock')
  const hasMock = results.some(r => r.type === 'mock');
  if (hasMock && awardBadge('mock_first')) newBadges.push('mock_first');
  const has90 = results.some(r => r.type === 'mock' && r.percent >= 90);
  if (has90 && awardBadge('mock_90')) newBadges.push('mock_90');

  return newBadges.map(id => ALL_BADGES.find(b => b.id === id)).filter(Boolean);
}

// ── Daily Goals ───────────────────────────────────────────

function getDailyGoal() {
  return getItem(STORAGE_KEYS.DAILY_GOAL, { topicsPerDay: 3, customSet: false });
}

function getExamDate() {
  const prefs = getPreferences();
  if (prefs.examDate) return prefs.examDate;
  // Compute the default ONCE and persist it so the 90-day window doesn't slide forward every day
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 90);
  const dateStr = defaultDate.toISOString().split('T')[0];
  setPreference('examDate', dateStr);
  return dateStr;
}

function setExamDate(dateStr) {
  setPreference('examDate', dateStr);
}

/**
 * Calculate recommended daily topics based on remaining syllabus.
 * @param {Array} units - syllabus units
 * @param {string} customExamDate - optional target exam date YYYY-MM-DD
 */
function calculateDailyTarget(units, customExamDate = null) {
  const progress = getProgress();
  let remaining = 0;
  units.forEach(unit => {
    unit.topics.forEach(topic => {
      if (progress[topic.id] !== 'done') remaining++;
    });
  });
  if (remaining === 0) return 0;

  const targetDateStr = customExamDate || getExamDate();
  const examDate = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = examDate - today;
  const examDaysAway = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return Math.max(1, Math.ceil(remaining / examDaysAway));
}

// ── Export / Import Backup ────────────────────────────────

function exportUserData() {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {}
  };
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    exportData.data[key] = getItem(key, null);
  });
  return JSON.stringify(exportData, null, 2);
}

function importUserData(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) {
      throw new Error('Invalid backup file format');
    }
    // Version compatibility guard — reject backups from future schema versions
    if (parsed.version && parsed.version !== '1.0') {
      throw new Error(`Incompatible backup version: ${parsed.version}. Expected 1.0.`);
    }
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (value !== null) {
        setItem(key, value);
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Mistakes ──────────────────────────────────────────────

function getMistakes() {
  return getItem(STORAGE_KEYS.MISTAKES, []);
}

function addMistake(qId) {
  const mistakes = getMistakes();
  if (!mistakes.includes(qId)) {
    mistakes.push(qId);
    setItem(STORAGE_KEYS.MISTAKES, mistakes);
  }
}

function removeMistake(qId) {
  let mistakes = getMistakes();
  if (mistakes.includes(qId)) {
    mistakes = mistakes.filter(id => id !== qId);
    setItem(STORAGE_KEYS.MISTAKES, mistakes);
  }
}

// ── Bookmarks ─────────────────────────────────────────────

function getBookmarks() {
  return getItem(STORAGE_KEYS.BOOKMARKS, []);
}

function isBookmarked(qId) {
  return getBookmarks().includes(qId);
}

function toggleBookmark(qId) {
  let bookmarks = getBookmarks();
  const index = bookmarks.indexOf(qId);
  let isAdded = false;
  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(qId);
    isAdded = true;
  }
  setItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
  return isAdded;
}

// ── Subtopics ─────────────────────────────────────────────

function getSubtopicsProgress() {
  return getItem(STORAGE_KEYS.SUBTOPICS, {});
}

function isSubtopicChecked(topicId, subtopicIdx) {
  const data = getSubtopicsProgress();
  return Boolean(data[`${topicId}_${subtopicIdx}`]);
}

function setSubtopicChecked(topicId, subtopicIdx, checked) {
  const data = getSubtopicsProgress();
  const key = `${topicId}_${subtopicIdx}`;
  if (checked) {
    data[key] = true;
  } else {
    delete data[key];
  }
  setItem(STORAGE_KEYS.SUBTOPICS, data);
}

// ── Full Reset ────────────────────────────────────────────

function resetEverything() {
  Object.values(STORAGE_KEYS).forEach(key => removeItem(key));
}

// ── Export ────────────────────────────────────────────────

export {
  STORAGE_KEYS,
  ALL_BADGES,
  getProgress,
  setTopicStatus,
  getTopicStatus,
  getOverallProgress,
  getUnitProgress,
  resetAllProgress,
  getResults,
  saveResult,
  getRecentResults,
  getStreakData,
  updateStreak,
  getCurrentStreak,
  getStudyTime,
  addStudySession,
  getPreferences,
  setPreference,
  getEarnedBadges,
  awardBadge,
  checkAndAwardBadges,
  getDailyGoal,
  getExamDate,
  setExamDate,
  calculateDailyTarget,
  getMistakes,
  addMistake,
  removeMistake,
  getBookmarks,
  isBookmarked,
  toggleBookmark,
  getSubtopicsProgress,
  isSubtopicChecked,
  setSubtopicChecked,
  exportUserData,
  importUserData,
  resetEverything,
  isStorageAvailable,
};
