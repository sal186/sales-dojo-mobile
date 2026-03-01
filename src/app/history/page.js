'use client';
import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { getScoreClass } from '@/lib/scoring';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setSessions(storage.getSessions());
    setStats(storage.getStats());
  }, []);

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function viewSession(session) {
    storage.saveCurrent(session);
    window.location.href = '/scorecard';
  }

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="header">
        <h1>⚡ <span>HISTORY</span></h1>
        <a href="/" className="header-link">← Train</a>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgScore}</div>
            <div className="stat-label">Avg Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.bestScore}</div>
            <div className="stat-label">Best</div>
          </div>
        </div>
      )}

      {/* Score Trend Chart */}
      {stats && stats.recentScores.length > 1 && (
        <div className="chart-container">
          <h3>📈 Score Trend (Last 10)</h3>
          <div className="chart-line">
            <svg className="chart-svg" viewBox="0 0 300 120" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="30" x2="300" y2="30" stroke="#333" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="#333" strokeWidth="0.5" />
              <line x1="0" y1="90" x2="300" y2="90" stroke="#333" strokeWidth="0.5" />

              {/* Score line */}
              <polyline
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={stats.recentScores.map((s, i) => {
                  const x = (i / Math.max(stats.recentScores.length - 1, 1)) * 290 + 5;
                  const y = 115 - (s.score / 100) * 110;
                  return `${x},${y}`;
                }).join(' ')}
              />

              {/* Score dots */}
              {stats.recentScores.map((s, i) => {
                const x = (i / Math.max(stats.recentScores.length - 1, 1)) * 290 + 5;
                const y = 115 - (s.score / 100) * 110;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="var(--gold)"
                    stroke="var(--bg)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="history-empty">
          <div className="empty-icon">🥋</div>
          <p>No sessions yet.<br />Start your first roleplay to see results here.</p>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((s) => {
            const score = s.scorecard?.overallScore || 0;
            const cls = getScoreClass(score);
            return (
              <div
                key={s.id}
                className="history-card"
                onClick={() => viewSession(s)}
              >
                <div className="history-card-top">
                  <span className="history-score" style={{
                    color: cls === 'high' ? 'var(--green)' : cls === 'mid' ? 'var(--gold)' : 'var(--red)'
                  }}>
                    {score}
                  </span>
                  <span className="history-date">{formatDate(s.date)}</span>
                </div>
                <div className="history-scenario">{s.scenario}</div>
                <div className="history-badges">
                  <span
                    className="history-badge"
                    style={{
                      background: s.difficulty === 'easy' ? '#22c55e20' : s.difficulty === 'moderate' ? '#f59e0b20' : '#ef444420',
                      color: s.difficulty === 'easy' ? 'var(--green)' : s.difficulty === 'moderate' ? 'var(--gold)' : 'var(--red)',
                    }}
                  >
                    {s.difficulty}
                  </span>
                  {s.scorecard?.grade && (
                    <span className="history-badge" style={{ background: '#3b82f620', color: 'var(--blue)' }}>
                      {s.scorecard.grade}
                    </span>
                  )}
                  <span className="history-badge" style={{ background: '#52525b20', color: 'var(--text-muted)' }}>
                    {s.messages?.filter(m => m.role === 'user').length || 0} turns
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <a href="/">
          <span className="nav-icon">⚡</span>
          Train
        </a>
        <a href="/history" className="active">
          <span className="nav-icon">📊</span>
          History
        </a>
      </nav>
    </div>
  );
}
