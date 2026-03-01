'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { DIMENSIONS, getScoreClass, getGradeColor } from '@/lib/scoring';

export default function ScorecardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const current = storage.getCurrent();
    if (!current || !current.scorecard) {
      router.push('/');
      return;
    }
    setSession(current);
  }, [router]);

  if (!session || !session.scorecard) {
    return (
      <div className="container">
        <div className="loading-screen">
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Loading scorecard...</p>
        </div>
      </div>
    );
  }

  const sc = session.scorecard;
  const scoreClass = getScoreClass(sc.overallScore);

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="header">
        <h1>⚡ <span>SCORE</span>CARD</h1>
        <a href="/history" className="header-link">History →</a>
      </div>

      {/* Score Hero */}
      <div className="score-hero">
        <div className={`score-number ${scoreClass}`}>{sc.overallScore}</div>
        <div className="score-grade" style={{ color: getGradeColor(sc.grade) }}>
          Grade: {sc.grade}
        </div>
        <div className="score-scenario">
          {session.scenario?.substring(0, 80)}{session.scenario?.length > 80 ? '...' : ''}
        </div>
        <div style={{ marginTop: '4px' }}>
          <span className={`chat-diff ${session.difficulty}`}>{session.difficulty}</span>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="dimensions">
        {DIMENSIONS.map(dim => {
          const dimData = sc.dimensions?.[dim.key];
          if (!dimData) return null;
          const cls = getScoreClass(dimData.score);
          return (
            <div key={dim.key} className="dim-row">
              <span className="dim-label">{dim.icon} {dim.label}</span>
              <div className="dim-bar">
                <div
                  className={`dim-fill ${cls}`}
                  style={{ width: `${dimData.score}%` }}
                />
              </div>
              <span className="dim-score" style={{
                color: cls === 'high' ? 'var(--green)' : cls === 'mid' ? 'var(--gold)' : 'var(--red)'
              }}>
                {dimData.score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dimension Summaries */}
      <div className="feedback-section">
        <h3>📋 Score Breakdown</h3>
        {DIMENSIONS.map(dim => {
          const dimData = sc.dimensions?.[dim.key];
          if (!dimData?.summary) return null;
          return (
            <div key={dim.key} className="feedback-item">
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                {dim.icon} {dim.label}
              </div>
              <div className="feedback-analysis">{dimData.summary}</div>
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      {sc.strengths && sc.strengths.length > 0 && (
        <div className="feedback-section">
          <h3 className="good">✅ What You Did Well</h3>
          {sc.strengths.map((s, i) => (
            <div key={i} className="feedback-item">
              {s.quote && <div className="feedback-quote">"{s.quote}"</div>}
              <div className="feedback-analysis">{s.analysis}</div>
            </div>
          ))}
        </div>
      )}

      {/* Improvements */}
      {sc.improvements && sc.improvements.length > 0 && (
        <div className="feedback-section">
          <h3 className="improve">🔴 Where to Improve</h3>
          {sc.improvements.map((imp, i) => (
            <div key={i} className="feedback-item">
              {imp.quote && <div className="feedback-quote">"{imp.quote}"</div>}
              <div className="feedback-analysis">{imp.analysis}</div>
              {imp.rewrite && (
                <div className="rewrite-box">
                  <div className="rewrite-label">Better Response</div>
                  <div className="rewrite-text">{imp.rewrite}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <a href="/" className="action-btn primary">🥋 New Session</a>
        <a href="/history" className="action-btn secondary">📊 History</a>
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <a href="/">
          <span className="nav-icon">⚡</span>
          Train
        </a>
        <a href="/history">
          <span className="nav-icon">📊</span>
          History
        </a>
      </nav>
    </div>
  );
}
