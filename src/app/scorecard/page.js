'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';

var DIMENSIONS = [
  { key: 'empathy', label: 'Empathy', icon: '&#x1F49C;' },
  { key: 'objectionHandling', label: 'Objection Handling', icon: '&#x1F6E1;&#xFE0F;' },
  { key: 'clarity', label: 'Clarity', icon: '&#x1F4A1;' },
  { key: 'closingTechnique', label: 'Closing', icon: '&#x1F3AF;' },
  { key: 'activeListening', label: 'Active Listening', icon: '&#x1F442;' },
];

function getScoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function getGradeEmoji(grade) {
  if (!grade) return '';
  if (grade.startsWith('A')) return ' &#x1F31F;';
  if (grade.startsWith('B')) return ' &#x1F44D;';
  if (grade.startsWith('C')) return ' &#x1F4AA;';
  return ' &#x1F6A7;';
}

export default function ScorecardPage() {
  var router = useRouter();
  var [session, setSession] = useState(null);
  var [showConvo, setShowConvo] = useState(false);
  var [shareMsg, setShareMsg] = useState('');

  useEffect(function() {
    var current = storage.getCurrent();
    if (!current || !current.scorecard) { router.push('/'); return; }
    setSession(current);
  }, []);

  if (!session || !session.scorecard) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading scorecard...</div>
      </div>
    );
  }

  var sc = session.scorecard;
  var scoreColor = getScoreColor(sc.overallScore);
  var personaName = session.persona ? session.persona.name : 'AI Buyer';
  var personaTitle = session.persona ? session.persona.title : '';
  var turns = session.messages ? session.messages.filter(function(m) { return m.role === 'user'; }).length : 0;
  var duration = session.startedAt && session.endedAt ? Math.round((session.endedAt - session.startedAt) / 60000) : null;

  function doShare() {
    var text = 'Sales Dojo Scorecard\n\n';
    text += 'Score: ' + sc.overallScore + '/100 (' + sc.grade + ')\n';
    text += 'Difficulty: ' + (session.difficulty || '') + '\n';
    text += 'Buyer: ' + personaName + ', ' + personaTitle + '\n';
    text += 'Turns: ' + turns + '\n\n';
    DIMENSIONS.forEach(function(dim) {
      var d = sc.dimensions ? sc.dimensions[dim.key] : null;
      if (d) text += dim.label + ': ' + d.score + '/100\n';
    });
    text += '\nPractice your pitch at sales-dojo-mobile.vercel.app';

    if (navigator.share) {
      navigator.share({ title: 'Sales Dojo Score', text: text }).catch(function() {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        setShareMsg('Copied!');
        setTimeout(function() { setShareMsg(''); }, 2000);
      });
    }
  }

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="header">
        <h1>&#9889; <span>SCORE</span>CARD</h1>
        <a href="/history" className="header-link">History &rsaquo;</a>
      </div>

      {/* Big Score */}
      <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid ' + scoreColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', background: scoreColor + '15' }}>
          <div style={{ fontSize: '40px', fontWeight: '800', color: scoreColor, lineHeight: '1' }}>{sc.overallScore}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>/100</div>
        </div>
        <div style={{ fontSize: '28px', fontWeight: '700' }} dangerouslySetInnerHTML={{ __html: sc.grade + getGradeEmoji(sc.grade) }} />
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
          vs {personaName}{personaTitle ? ', ' + personaTitle : ''}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', color: session.difficulty === 'easy' ? '#22c55e' : session.difficulty === 'difficult' ? '#ef4444' : '#eab308' }}>{session.difficulty}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{turns} turns</span>
          {duration && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{duration} min</span>}
        </div>
      </div>

      {/* Dimension Bars */}
      <div style={{ background: 'var(--bg-input)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '14px' }}>SKILL BREAKDOWN</div>
        {DIMENSIONS.map(function(dim) {
          var d = sc.dimensions ? sc.dimensions[dim.key] : null;
          if (!d) return null;
          var color = getScoreColor(d.score);
          return (
            <div key={dim.key} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: dim.icon + ' ' + dim.label }} />
                <span style={{ fontSize: '14px', fontWeight: '700', color: color }}>{d.score}</span>
              </div>
              <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: d.score + '%', height: '100%', background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
              </div>
              {d.summary && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>{d.summary}</div>}
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      {sc.strengths && sc.strengths.length > 0 && (
        <div style={{ background: '#22c55e10', border: '1px solid #22c55e30', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#22c55e', marginBottom: '12px' }}>&#x2705; WHAT WORKED</div>
          {sc.strengths.map(function(s, i) {
            return (
              <div key={i} style={{ marginBottom: i < sc.strengths.length - 1 ? '12px' : '0' }}>
                {s.quote && <div style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic', padding: '8px 12px', background: '#22c55e10', borderRadius: '8px', borderLeft: '3px solid #22c55e', marginBottom: '6px' }}>"{s.quote}"</div>}
                {s.analysis && <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{s.analysis}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Improvements */}
      {sc.improvements && sc.improvements.length > 0 && (
        <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444', marginBottom: '12px' }}>&#x1F6A8; IMPROVE THIS</div>
          {sc.improvements.map(function(imp, i) {
            return (
              <div key={i} style={{ marginBottom: i < sc.improvements.length - 1 ? '16px' : '0' }}>
                {imp.quote && <div style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic', padding: '8px 12px', background: '#ef444410', borderRadius: '8px', borderLeft: '3px solid #ef4444', marginBottom: '6px' }}>"{imp.quote}"</div>}
                {imp.analysis && <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '6px' }}>{imp.analysis}</div>}
                {imp.rewrite && (
                  <div style={{ padding: '10px 12px', background: '#22c55e10', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#22c55e', marginBottom: '4px', letterSpacing: '0.5px' }}>SAY THIS INSTEAD</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>"{imp.rewrite}"</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Conversation Replay */}
      {session.messages && session.messages.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={function() { setShowConvo(!showConvo); }} style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid #333', borderRadius: '14px', color: 'var(--text)', fontSize: '14px', cursor: 'pointer', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>&#x1F4AC; View Conversation ({session.messages.length} messages)</span>
            <span style={{ transform: showConvo ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>&#x25BC;</span>
          </button>
          {showConvo && (
            <div style={{ marginTop: '8px', background: 'var(--bg-input)', borderRadius: '14px', padding: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {session.messages.map(function(msg, i) {
                var isUser = msg.role === 'user';
                return (
                  <div key={i} style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>{isUser ? 'You' : personaName}</div>
                    <div style={{ padding: '8px 12px', borderRadius: '12px', background: isUser ? 'var(--gold)' : '#333', color: isUser ? '#000' : 'var(--text)', fontSize: '13px', lineHeight: '1.4', maxWidth: '85%' }}>{msg.content}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <a href="/" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', background: 'var(--gold)', color: '#000', borderRadius: '14px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>New Session</a>
        <button onClick={doShare} style={{ flex: 1, padding: '14px', background: 'var(--bg-input)', border: '1px solid #333', borderRadius: '14px', color: 'var(--text)', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>{shareMsg || 'Share Score'}</button>
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <a href="/"><span className="nav-icon">&#9889;</span>Train</a>
        <a href="/history"><span className="nav-icon">&#x1F4CA;</span>History</a>
      </nav>
    </div>
  );
}
