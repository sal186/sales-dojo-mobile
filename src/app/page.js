'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';

const QUICK_PICKS = [
  "I'm cold calling a restaurant owner about POS systems",
  "I'm selling solar panels to a skeptical homeowner",
  "I'm pitching my marketing agency to a startup founder",
  "I'm an insurance broker handling rate objection",
  "I'm a realtor presenting at a listing appointment",
  "I'm selling SaaS to a CTO who hates vendors",
];

export default function Home() {
  const router = useRouter();
  const [scenario, setScenario] = useState('');
  const [difficulty, setDifficulty] = useState(null);
  const [loading, setLoading] = useState(false);

  const canStart = scenario.trim().length > 10 && difficulty;

  async function startSession() {
    if (!canStart || loading) return;
    setLoading(true);

    storage.saveCurrent({
      scenario: scenario.trim(),
      difficulty,
      messages: [],
      startedAt: Date.now(),
    });

    router.push('/chat');
  }

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="header">
        <h1>⚡ <span>SALES</span> DOJO</h1>
        <a href="/history" className="header-link">History →</a>
      </div>

      {/* Hero */}
      <div className="hero">
        <h2>Practice your pitch.<br /><em>Get brutally honest.</em></h2>
        <p>Describe a sales scenario and pick your difficulty. The AI buyer never breaks character.</p>
      </div>

      {/* Scenario Input */}
      <textarea
        className="scenario-input"
        placeholder={"Describe your scenario...\n\nExample: I'm selling enterprise software to a VP of Operations who thinks their spreadsheets work fine"}
        value={scenario}
        onChange={e => setScenario(e.target.value)}
        maxLength={500}
      />

      {/* Quick Picks */}
      <div className="quick-picks">
        {QUICK_PICKS.map((pick, i) => (
          <button
            key={i}
            className="quick-pick"
            onClick={() => setScenario(pick)}
          >
            {pick.length > 45 ? pick.substring(0, 45) + '…' : pick}
          </button>
        ))}
      </div>

      {/* Difficulty */}
      <div className="difficulty-section">
        <h3>Select Difficulty</h3>
        <div className="difficulty-buttons">
          <button
            className={`diff-btn easy ${difficulty === 'easy' ? 'active' : ''}`}
            onClick={() => setDifficulty('easy')}
          >
            <span className="diff-icon">🟢</span>
            Easy
            <span className="diff-desc">Friendly & hesitant</span>
          </button>
          <button
            className={`diff-btn moderate ${difficulty === 'moderate' ? 'active' : ''}`}
            onClick={() => setDifficulty('moderate')}
          >
            <span className="diff-icon">🟡</span>
            Moderate
            <span className="diff-desc">Pushes back on price</span>
          </button>
          <button
            className={`diff-btn difficult ${difficulty === 'difficult' ? 'active' : ''}`}
            onClick={() => setDifficulty('difficult')}
          >
            <span className="diff-icon">🔴</span>
            Difficult
            <span className="diff-desc">Hostile & impatient</span>
          </button>
        </div>
      </div>

      {/* Start Button */}
      <button
        className="start-btn"
        disabled={!canStart || loading}
        onClick={startSession}
      >
        {loading ? 'Starting...' : '🥋 Start Roleplay'}
      </button>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <a href="/" className="active">
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
