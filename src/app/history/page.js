'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';

function drawChart(canvas, scores) {
  if (!canvas || scores.length < 2) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.offsetWidth * 2;
  var h = canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);
  var cw = canvas.offsetWidth;
  var ch = canvas.offsetHeight;
  ctx.clearRect(0, 0, cw, ch);

  var pad = { top: 20, right: 16, bottom: 30, left: 36 };
  var gw = cw - pad.left - pad.right;
  var gh = ch - pad.top - pad.bottom;

  var vals = scores.map(function(s) { return s.score; });
  var minV = Math.max(0, Math.min.apply(null, vals) - 10);
  var maxV = Math.min(100, Math.max.apply(null, vals) + 10);
  if (maxV - minV < 20) { minV = Math.max(0, minV - 10); maxV = Math.min(100, maxV + 10); }

  // Grid lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'right';
  var steps = 4;
  for (var gi = 0; gi <= steps; gi++) {
    var yy = pad.top + gh - (gi / steps) * gh;
    var label = Math.round(minV + (gi / steps) * (maxV - minV));
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(pad.left + gw, yy);
    ctx.stroke();
    ctx.fillText(label.toString(), pad.left - 6, yy + 3);
  }

  // Points
  var points = [];
  for (var i = 0; i < vals.length; i++) {
    var px = pad.left + (i / (vals.length - 1)) * gw;
    var py = pad.top + gh - ((vals[i] - minV) / (maxV - minV)) * gh;
    points.push({ x: px, y: py });
  }

  // Gradient fill
  var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gh);
  grad.addColorStop(0, 'rgba(245, 166, 35, 0.3)');
  grad.addColorStop(1, 'rgba(245, 166, 35, 0.0)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, pad.top + gh);
  for (var fi = 0; fi < points.length; fi++) ctx.lineTo(points[fi].x, points[fi].y);
  ctx.lineTo(points[points.length - 1].x, pad.top + gh);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var li = 1; li < points.length; li++) ctx.lineTo(points[li].x, points[li].y);
  ctx.strokeStyle = '#f5a623';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Dots
  for (var di = 0; di < points.length; di++) {
    ctx.beginPath();
    ctx.arc(points[di].x, points[di].y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f5a623';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // X labels
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.font = '9px -apple-system, sans-serif';
  for (var xi = 0; xi < scores.length; xi++) {
    var xp = pad.left + (xi / (scores.length - 1)) * gw;
    var d = new Date(scores[xi].date);
    var lbl = (d.getMonth() + 1) + '/' + d.getDate();
    ctx.fillText(lbl, xp, pad.top + gh + 16);
  }
}

function getStreak(sessions) {
  if (sessions.length === 0) return 0;
  var streak = 0;
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  for (var i = 0; i < 365; i++) {
    var checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    var dayStr = checkDate.toISOString().split('T')[0];
    var hasSession = sessions.some(function(s) {
      return s.date && s.date.split('T')[0] === dayStr;
    });
    if (hasSession) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getDiffBreakdown(sessions) {
  var easy = 0, moderate = 0, difficult = 0;
  sessions.forEach(function(s) {
    if (s.difficulty === 'easy') easy++;
    else if (s.difficulty === 'moderate') moderate++;
    else if (s.difficulty === 'difficult') difficult++;
  });
  return { easy: easy, moderate: moderate, difficult: difficult };
}

export default function HistoryPage() {
  var router = useRouter();
  var [sessions, setSessions] = useState([]);
  var [stats, setStats] = useState(null);
  var [streak, setStreak] = useState(0);
  var [diffBreakdown, setDiffBreakdown] = useState({ easy: 0, moderate: 0, difficult: 0 });
  var [tab, setTab] = useState('dashboard');
  var chartRef = useRef(null);

  useEffect(function() {
    var all = storage.getSessions();
    setSessions(all);
    var s = storage.getStats();
    setStats(s);
    setStreak(getStreak(all));
    setDiffBreakdown(getDiffBreakdown(all));
  }, []);

  useEffect(function() {
    if (stats && stats.recentScores && stats.recentScores.length >= 2 && chartRef.current) {
      drawChart(chartRef.current, stats.recentScores);
    }
  }, [stats, tab]);

  function viewSession(s) {
    storage.saveCurrent(s);
    router.push('/scorecard');
  }

  var avgGrade = '';
  if (stats) {
    var a = stats.avgScore;
    if (a >= 80) avgGrade = 'A';
    else if (a >= 70) avgGrade = 'B+';
    else if (a >= 60) avgGrade = 'B';
    else if (a >= 50) avgGrade = 'C+';
    else if (a >= 40) avgGrade = 'C';
    else if (a >= 30) avgGrade = 'D';
    else avgGrade = 'F';
  }

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="header">
        <h1>&#9889; <span>SALES</span> DOJO</h1>
        <a href="/" className="header-link">&lsaquo; Train</a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' }}>
        <button onClick={function() { setTab('dashboard'); }} style={{ flex: 1, padding: '10px', border: 'none', background: tab === 'dashboard' ? 'var(--gold)' : 'transparent', color: tab === 'dashboard' ? '#000' : 'var(--text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Dashboard</button>
        <button onClick={function() { setTab('history'); }} style={{ flex: 1, padding: '10px', border: 'none', borderLeft: '1px solid #333', background: tab === 'history' ? 'var(--gold)' : 'transparent', color: tab === 'history' ? '#000' : 'var(--text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>History</button>
      </div>

      {tab === 'dashboard' && (
        <div>
          {!stats ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#x1F3AF;</div>
              <h3 style={{ marginBottom: '8px', color: 'var(--text)' }}>No sessions yet</h3>
              <p>Complete your first roleplay to see your progress here.</p>
              <a href="/" style={{ display: 'inline-block', marginTop: '16px', padding: '12px 24px', background: 'var(--gold)', color: '#000', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>Start Training</a>
            </div>
          ) : (
            <div>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--gold)' }}>{stats.totalSessions}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Sessions</div>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--gold)' }}>{stats.avgScore}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Avg Score ({avgGrade})</div>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--gold)' }}>{stats.bestScore}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Best Score</div>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: streak > 0 ? '#ef4444' : 'var(--text-muted)' }}>{streak}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{streak > 0 ? 'Day Streak &#x1F525;' : 'Day Streak'}</div>
                </div>
              </div>

              {/* Score Trend Chart */}
              {stats.recentScores && stats.recentScores.length >= 2 && (
                <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px' }}>SCORE TREND (Last 10)</div>
                  <canvas ref={chartRef} style={{ width: '100%', height: '180px', display: 'block' }} />
                </div>
              )}

              {/* Difficulty Breakdown */}
              <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px' }}>DIFFICULTY BREAKDOWN</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e' }}>{diffBreakdown.easy}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Easy</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#eab308' }}>{diffBreakdown.moderate}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Moderate</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{diffBreakdown.difficult}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Difficult</div>
                  </div>
                </div>
                {stats.totalSessions > 0 && (
                  <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '12px', background: '#222' }}>
                    {diffBreakdown.easy > 0 && <div style={{ width: (diffBreakdown.easy / stats.totalSessions * 100) + '%', background: '#22c55e' }} />}
                    {diffBreakdown.moderate > 0 && <div style={{ width: (diffBreakdown.moderate / stats.totalSessions * 100) + '%', background: '#eab308' }} />}
                    {diffBreakdown.difficult > 0 && <div style={{ width: (diffBreakdown.difficult / stats.totalSessions * 100) + '%', background: '#ef4444' }} />}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#x1F4AD;</div>
              <h3 style={{ marginBottom: '8px', color: 'var(--text)' }}>No sessions yet</h3>
              <p>Complete your first roleplay to see it here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sessions.map(function(s, i) {
                var date = s.date ? new Date(s.date) : new Date();
                var dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                var turns = s.messages ? s.messages.filter(function(m) { return m.role === 'user'; }).length : 0;
                var score = s.scorecard ? s.scorecard.overallScore : null;
                var grade = s.scorecard ? s.scorecard.grade : null;
                var personaName = s.persona ? s.persona.name : '';

                return (
                  <button key={i} onClick={function() { viewSession(s); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-input)', border: '1px solid #222', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    {/* Score circle */}
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: score >= 70 ? '#22c55e20' : score >= 50 ? '#eab30820' : '#ef444420', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444' }}>{score || '--'}</span>
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.scenario ? s.scenario.substring(0, 50) : 'Session'}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dateStr}</span>
                        {personaName && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>vs {personaName}</span>}
                        <span style={{ fontSize: '11px', color: s.difficulty === 'easy' ? '#22c55e' : s.difficulty === 'difficult' ? '#ef4444' : '#eab308' }}>{s.difficulty}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{turns} turns</span>
                        {grade && <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gold)' }}>{grade}</span>}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>&rsaquo;</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <a href="/"><span className="nav-icon">&#9889;</span>Train</a>
        <a href="/history" className="active"><span className="nav-icon">&#x1F4CA;</span>History</a>
      </nav>
    </div>
  );
}
