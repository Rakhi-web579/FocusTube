const STORAGE_KEY = 'focustube_stats';

function getStats() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {
      currentStreak: 0,
      lastStudyDate: null,
      totalSessions: 0,
      totalFocusTime: 0,
      bestFocusScore: 0,
      badges: [],
      sessionHistory: []
    };
  } catch {
    return {
      currentStreak: 0,
      lastStudyDate: null,
      totalSessions: 0,
      totalFocusTime: 0,
      bestFocusScore: 0,
      badges: [],
      sessionHistory: []
    };
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function updateStreak() {
  const stats = getStats();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (stats.lastStudyDate === today) {
    // Already studied today, no change
    return stats;
  } else if (stats.lastStudyDate === yesterday) {
    // Studied yesterday, streak continues
    stats.currentStreak += 1;
  } else {
    // Streak broken or first time
    stats.currentStreak = 1;
  }

  stats.lastStudyDate = today;
  saveStats(stats);
  return stats;
}

export function saveSession(sessionData) {
  const stats = getStats();

  // Update streak
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (stats.lastStudyDate === today) {
    // no streak change
  } else if (stats.lastStudyDate === yesterday) {
    stats.currentStreak += 1;
  } else {
    stats.currentStreak = 1;
  }
  stats.lastStudyDate = today;

  // Update totals
  stats.totalSessions += 1;
  stats.totalFocusTime += sessionData.focusTimeSpent || 0;

  if ((sessionData.focusScore || 0) > stats.bestFocusScore) {
    stats.bestFocusScore = sessionData.focusScore;
  }

  // Check for new badges
  const newBadges = [];
  if (stats.currentStreak === 3 && !stats.badges.includes('3_day_streak')) {
    newBadges.push('3_day_streak');
    stats.badges.push('3_day_streak');
  }
  if (stats.currentStreak === 7 && !stats.badges.includes('7_day_streak')) {
    newBadges.push('7_day_streak');
    stats.badges.push('7_day_streak');
  }
  if (stats.totalSessions === 5 && !stats.badges.includes('5_sessions')) {
    newBadges.push('5_sessions');
    stats.badges.push('5_sessions');
  }
  if ((sessionData.focusScore || 0) >= 90 && !stats.badges.includes('focus_master')) {
    newBadges.push('focus_master');
    stats.badges.push('focus_master');
  }
  if (stats.totalFocusTime >= 3600 && !stats.badges.includes('one_hour_total')) {
    newBadges.push('one_hour_total');
    stats.badges.push('one_hour_total');
  }

  // Add to history
  stats.sessionHistory.push({
    date: new Date().toISOString(),
    goal: sessionData.goal,
    focusScore: sessionData.focusScore,
    focusTime: sessionData.focusTimeSpent,
    quizScore: sessionData.quizScore,
  });

  // Keep only last 20 sessions
  if (stats.sessionHistory.length > 20) {
    stats.sessionHistory = stats.sessionHistory.slice(-20);
  }

  saveStats(stats);
  return { stats, newBadges };
}

export function getStoredStats() {
  return getStats();
}

export function clearStats() {
  localStorage.removeItem(STORAGE_KEY);
}