'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { getRandomPersona } from '@/lib/prompts';

var SCENARIOS = {
  'Cold Call': [
    'Cold calling a VP of Sales who has never heard of your company. You sell sales enablement software.',
    'Cold calling a Head of Marketing at a DTC brand. You sell an AI-powered ad optimization platform.',
    'Cold calling a CTO at a Series A startup. You sell developer productivity tools.',
    'Cold calling a Director of HR. You sell an employee engagement platform.',
  ],
  'Discovery': [
    'First discovery call with a Head of Operations who agreed to a meeting but seems lukewarm. You sell workflow automation.',
    'Discovery call with a CFO who wants to cut costs. You sell a spend management platform.',
    'Discovery call with a VP of Engineering evaluating build vs buy. You sell an API platform.',
    'Discovery call with a CMO who is overwhelmed with too many tools. You sell a marketing analytics suite.',
  ],
  'Demo': [
    'Giving a product demo to a Director of Product who has seen 3 competitor demos this week.',
    'Demo for a CEO who wants to see ROI in the first 2 minutes or will check out.',
    'Demo for a technical team lead who will grill you on architecture and security.',
    'Demo for a committee of 3 stakeholders with different priorities: cost, features, and timeline.',
  ],
  'Negotiation': [
    'The prospect loves your product but says your competitor quoted 30 percent less. Close the deal.',
    'Final negotiation with a CFO who wants a 40 percent discount on a 100K annual contract.',
    'The champion loves you but their procurement team is demanding impossible contract terms.',
    'Renewal negotiation where the client is threatening to churn over a price increase.',
  ],
  'Objection Handling': [
    'The prospect says: We are happy with our current solution. Convince them to switch.',
    'The prospect says: I need to talk to my team about this. Keep the deal moving.',
    'The prospect says: We do not have budget for this right now. Create urgency.',
    'The prospect says: I had a terrible experience with a similar product. Rebuild trust.',
  ],
  'Upsell': [
    'Quarterly business review with an existing customer. Pitch upgrading from Basic to Enterprise tier.',
    'Your customer just hit their usage limit. Pitch them on expanding their contract.',
    'A customer on a single-team plan is growing fast. Pitch company-wide deployment.',
  ],
};

var CATEGORIES = Object.keys(SCENARIOS);

export default function HomePage() {
  var router = useRouter();
  var [scenario, setScenario] = useState('');
  var [difficulty, setDifficulty] = useState('moderate');
  var [loading, setLoading] = useState(false);
  var [activeCategory, setActiveCategory] = useState(null);

  var canStart = scenario.trim().length > 10;

  function startSession() {
    if (!canStart || loading) return;
    setLoading(true);
    var p = getRandomPersona();
    var session = {
      scenario: scenario,
      difficulty: difficulty,
      persona: p,
      messages: [],
      startedAt: Date.now(),
    };
    storage.saveCurrent(session);
    router.push('/chat');
  }

  function pickScenario(s) {
    setScenario(s);
    setActiveCategory(null);
  }

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="header">
        <h1>&#9889; <span>SALES</span> DOJO</h1>
        <a href="/history" className="header-link">History &rsaquo;</a>
      </div>

      {/* Hero */}
      <div className="hero">
        <h2>Practice your pitch.<br /><em>Get brutally honest.</em></h2>
        <p>Pick a scenario or write your own. The AI buyer never breaks character.</p>
      </div>

      {/* Scenario Categories */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>QUICK SCENARIOS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {CATEGORIES.map(function(cat) {
            return (
              <button
                key={cat}
                onClick={function() { setActiveCategory(activeCategory === cat ? null : cat); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: activeCategory === cat ? '1px solid var(--gold)' : '1px solid #333',
                  background: activeCategory === cat ? 'var(--gold)' : 'transparent',
                  color: activeCategory === cat ? '#000' : 'var(--text)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: activeCategory === cat ? '600' : '400',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {activeCategory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
            {SCENARIOS[activeCategory].map(function(s, i) {
              return (
                <button
                  key={i}
                  onClick={function() { pickScenario(s); }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: scenario === s ? '1px solid var(--gold)' : '1px solid #222',
                    background: scenario === s ? '#f5a62320' : 'var(--bg-input)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: '1.4',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Scenario Input */}
      <textarea
        className="scenario-input"
        placeholder={"Or describe your own scenario...\n\nExample: I'm selling enterprise software to a VP of Operations who thinks their spreadsheets work fine"}
        value={scenario}
        onChange={function(e) { setScenario(e.target.value); }}
        maxLength={500}
      />

      {/* Difficulty */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>DIFFICULTY</div>
        <div className="diff-row">
          <button
            className={'diff-btn easy ' + (difficulty === 'easy' ? 'active' : '')}
            onClick={function() { setDifficulty('easy'); }}
          >
            <span className="diff-icon">&#x1F7E2;</span>
            Easy
            <span className="diff-desc">Friendly buyer</span>
          </button>
          <button
            className={'diff-btn moderate ' + (difficulty === 'moderate' ? 'active' : '')}
            onClick={function() { setDifficulty('moderate'); }}
          >
            <span className="diff-icon">&#x1F7E1;</span>
            Moderate
            <span className="diff-desc">Skeptical buyer</span>
          </button>
          <button
            className={'diff-btn difficult ' + (difficulty === 'difficult' ? 'active' : '')}
            onClick={function() { setDifficulty('difficult'); }}
          >
            <span className="diff-icon">&#x1F534;</span>
            Difficult
            <span className="diff-desc">Hostile &amp; impatient</span>
          </button>
        </div>
      </div>

      {/* Start Button */}
      <button
        className="start-btn"
        disabled={!canStart || loading}
        onClick={startSession}
      >
        {loading ? 'Starting...' : 'Start Roleplay'}
      </button>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <a href="/" className="active">
          <span className="nav-icon">&#9889;</span>
          Train
        </a>
        <a href="/history">
          <span className="nav-icon">&#x1F4CA;</span>
          History
        </a>
      </nav>
    </div>
  );
}
