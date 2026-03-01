'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { buildRoleplayPrompt, buildScorecardPrompt } from '@/lib/prompts';

export default function ChatPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [ending, setEnding] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load session and get first AI message
  useEffect(() => {
    const current = storage.getCurrent();
    if (!current) {
      router.push('/');
      return;
    }
    setSession(current);

    // Get opening line from AI buyer
    async function getOpening() {
      try {
        const systemPrompt = buildRoleplayPrompt(current.scenario, current.difficulty);
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Begin the roleplay. Give your opening line as the buyer.' }],
            systemPrompt,
            mode: 'roleplay',
          }),
        });
        const data = await res.json();
        if (data.text) {
          const aiMsg = { role: 'assistant', content: data.text };
          setMessages([aiMsg]);
          storage.saveCurrent({ ...current, messages: [aiMsg] });
        }
      } catch (err) {
        console.error('Failed to get opening:', err);
      } finally {
        setInitializing(false);
      }
    }

    if (current.messages && current.messages.length > 0) {
      setMessages(current.messages);
      setInitializing(false);
    } else {
      getOpening();
    }
  }, [router]);

  async function sendMessage() {
    if (!input.trim() || loading || !session) return;

    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Save progress
    storage.saveCurrent({ ...session, messages: newMessages });

    try {
      const systemPrompt = buildRoleplayPrompt(session.scenario, session.difficulty);

      // Build conversation for API (skip the initial "begin" prompt)
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt,
          mode: 'roleplay',
        }),
      });

      const data = await res.json();
      if (data.text) {
        const aiMsg = { role: 'assistant', content: data.text };
        const updatedMessages = [...newMessages, aiMsg];
        setMessages(updatedMessages);
        storage.saveCurrent({ ...session, messages: updatedMessages });
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function endSession() {
    if (ending) return;
    setEnding(true);

    // Need at least 2 seller messages for a meaningful scorecard
    const sellerMessages = messages.filter(m => m.role === 'user');
    if (sellerMessages.length < 2) {
      alert('Keep going — you need at least 2 responses for a scorecard.');
      setEnding(false);
      return;
    }

    try {
      const systemPrompt = buildScorecardPrompt(session.scenario, session.difficulty, messages);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate the scorecard now.' }],
          systemPrompt,
          mode: 'scorecard',
        }),
      });

      const data = await res.json();
      let scorecard;

      try {
        // Clean potential markdown wrapping
        let cleaned = data.text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        scorecard = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('Scorecard parse error:', parseErr, data.text);
        scorecard = {
          overallScore: 50,
          grade: 'C',
          dimensions: {
            empathy: { score: 50, summary: 'Could not fully analyze.' },
            objectionHandling: { score: 50, summary: 'Could not fully analyze.' },
            clarity: { score: 50, summary: 'Could not fully analyze.' },
            closingTechnique: { score: 50, summary: 'Could not fully analyze.' },
            activeListening: { score: 50, summary: 'Could not fully analyze.' },
          },
          strengths: [],
          improvements: [],
        };
      }

      // Save completed session
      const completedSession = {
        scenario: session.scenario,
        difficulty: session.difficulty,
        messages,
        scorecard,
        startedAt: session.startedAt,
        endedAt: Date.now(),
      };

      storage.saveSession(completedSession);
      storage.saveCurrent({ ...completedSession, scorecard });

      router.push('/scorecard');
    } catch (err) {
      console.error('End session error:', err);
      setEnding(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!session) return null;

  const turnCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="container" style={{ paddingBottom: '16px' }}>
      {/* Chat Header */}
      <div className="chat-header">
        <div>
          <div className="chat-persona">🎭 AI Buyer</div>
        </div>
        <div className="chat-meta">
          <span className="chat-turns">Turn {turnCount}</span>
          <span className={`chat-diff ${session.difficulty}`}>
            {session.difficulty}
          </span>
          <button className="end-btn" onClick={endSession} disabled={ending}>
            {ending ? 'Scoring...' : 'End & Score'}
          </button>
        </div>
      </div>

      {/* Scenario reminder */}
      <div className="msg system">
        {session.scenario}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {initializing && (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}

        {ending && (
          <div className="msg system">
            ⚡ Generating your scorecard...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!ending && (
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Your response as the seller..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || initializing}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || loading || initializing}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}
