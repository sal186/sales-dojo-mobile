// ============================================
// LOCAL STORAGE MANAGER
// All data stored on-device. No server, no database.
// ============================================

const SESSIONS_KEY = 'salesdojo_sessions';
const CURRENT_KEY = 'salesdojo_current';

export const storage = {
  saveCurrent(data) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(data));
  },

  getCurrent() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  clearCurrent() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CURRENT_KEY);
  },

  getSessions() {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  saveSession(session) {
    if (typeof window === 'undefined') return;
    const sessions = this.getSessions();
    sessions.unshift({
      ...session,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    });
    if (sessions.length > 50) sessions.length = 50;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  },

  getSession(id) {
    return this.getSessions().find(s => s.id === id) || null;
  },

  getStats() {
    const sessions = this.getSessions();
    if (sessions.length === 0) return null;
    const scores = sessions.map(s => s.scorecard?.overallScore || 0);
    return {
      totalSessions: sessions.length,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      bestScore: Math.max(...scores),
      recentScores: sessions.slice(0, 10).map(s => ({
        score: s.scorecard?.overallScore || 0,
        date: s.date,
      })).reverse(),
    };
  },
};
