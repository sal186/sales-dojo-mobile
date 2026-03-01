'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voices, setVoices] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Speech recognition - continuous mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      setInput((final + interim).trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, []);

  const speakText = useCallback((text) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 0.95;
    const v = window.speechSynthesis.getVoices();
    const pick = v.find(x => x.name === 'Daniel') ||
                 v.find(x => x.name === 'Aaron') ||
                 v.find(x => x.name.includes('Google US English Male')) ||
                 v.find(x => x.name.includes('Google US English')) ||
                 v.find(x => x.lang === 'en-US' && x.name.includes('Male')) ||
                 v.find(x => x.lang === 'en-US') ||
                 v.find(x => x.lang.startsWith('en'));
    if (pick) u.voice = pick;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [voiceEnabled]);

  useEffect(() => {
    const current = storage.getCurrent();
    if (!current) { router.push('/'); return; }
    setSession(current);
    async function getOpening() {
      try {
        const sp = buildRoleplayPrompt(current.scenario, current.difficulty);
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Begin the roleplay. Give your opening line as the buyer.' }], systemPrompt: sp, mode: 'roleplay' }) });
        const data = await res.json();
        if (data.text) {
          const aiMsg = { role: 'assistant', content: data.text };
          setMessages([aiMsg]);
          storage.saveCurrent({ ...current, messages: [aiMsg] });
          setTimeout(() => speakText(data.text), 500);
        }
      } catch (err) { console.error('Opening error:', err); }
      finally { setInitializing(false); }
    }
    if (current.messages && current.messages.length > 0) { setMessages(current.messages); setInitializing(false); }
    else { getOpening(); }
  }, [router, speakText]);

  function toggleListening() {
    if (!recognitionRef.current) { alert('Speech recognition not supported. Try Chrome.'); return; }
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else {
      window.speechSynthesis.cancel(); setSpeaking(false);
      setInput('');
      recognitionRef.current.start();
      setListening(true);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !session) return;
    if (listening && recognitionRef.current) { recognitionRef.current.stop(); setListening(false); }
    const userMsg = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(''); setLoading(true);
    storage.saveCurrent({ ...session, messages: newMsgs });
    try {
      const sp = buildRoleplayPrompt(session.scenario, session.difficulty);
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })), systemPrompt: sp, mode: 'roleplay' }) });
      const data = await res.json();
      if (data.text) {
        const aiMsg = { role: 'assistant', content: data.text };
        const updated = [...newMsgs, aiMsg];
        setMessages(updated);
        storage.saveCurrent({ ...session, messages: updated });
        speakText(data.text);
      }
    } catch (err) { console.error('Send error:', err); }
    finally { setLoading(false); inputRef.current?.focus(); }
  }

  async function endSession() {
    if (ending) return; setEnding(true);
    window.speechSynthesis.cancel();
    const sellerMsgs = messages.filter(m => m.role === 'user');
    if (sellerMsgs.length < 2) { alert('Need at least 2 responses for a scorecard.'); setEnding(false); return; }
    try {
      const sp = buildScorecardPrompt(session.scenario, session.difficulty, messages);
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Generate the scorecard now.' }], systemPrompt: sp, mode: 'scorecard' }) });
      const data = await res.json();
      let scorecard;
      try { let c = data.text.trim(); if (c.startsWith('`')) c = c.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''); scorecard = JSON.parse(c); }
      catch (e) { scorecard = { overallScore: 50, grade: 'C', dimensions: { empathy: { score: 50, summary: 'N/A' }, objectionHandling: { score: 50, summary: 'N/A' }, clarity: { score: 50, summary: 'N/A' }, closingTechnique: { score: 50, summary: 'N/A' }, activeListening: { score: 50, summary: 'N/A' } }, strengths: [], improvements: [] }; }
      const done = { scenario: session.scenario, difficulty: session.difficulty, messages, scorecard, startedAt: session.startedAt, endedAt: Date.now() };
      storage.saveSession(done); storage.saveCurrent({ ...done, scorecard });
      router.push('/scorecard');
    } catch (err) { console.error('End error:', err); setEnding(false); }
  }

  function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  if (!session) return null;
  const turnCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="container" style={{ paddingBottom: '16px' }}>
      <div className="chat-header">
        <div><div className="chat-persona">🎭 AI Buyer</div></div>
        <div className="chat-meta">
          <span className="chat-turns">Turn {turnCount}</span>
          <span className={'chat-diff ' + session.difficulty}>{session.difficulty}</span>
          <button onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); setVoiceEnabled(!voiceEnabled); }} style={{ background: voiceEnabled ? 'var(--gold)' : '#333', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '16px', cursor: 'pointer' }}>{voiceEnabled ? '🔊' : '🔇'}</button>
          <button className="end-btn" onClick={endSession} disabled={ending}>{ending ? 'Scoring...' : 'End & Score'}</button>
        </div>
      </div>
      <div className="msg system">{session.scenario}</div>
      <div className="chat-messages">
        {initializing && <div className="typing-indicator"><span></span><span></span><span></span></div>}
        {messages.map((msg, i) => (
          <div key={i} className={'msg ' + (msg.role === 'user' ? 'user' : 'ai')}>
            {msg.content}
            {msg.role === 'assistant' && voiceEnabled && <button onClick={(e) => { e.stopPropagation(); speakText(msg.content); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', padding: '4px', marginTop: '4px', display: 'block' }}>🔊 Replay</button>}
          </div>
        ))}
        {loading && <div className="typing-indicator"><span></span><span></span><span></span></div>}
        {speaking && <div className="msg system" style={{ fontSize: '12px' }}>🔊 Speaking...</div>}
        {ending && <div className="msg system">⚡ Generating scorecard...</div>}
        <div ref={messagesEndRef} />
      </div>
      {!ending && (
        <div className="chat-input-row">
          <button onClick={toggleListening} style={{ width: '48px', height: '48px', border: listening ? '2px solid var(--red)' : '2px solid #333', borderRadius: '14px', background: listening ? '#ef444430' : 'var(--bg-input)', color: listening ? 'var(--red)' : 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={loading || initializing}>🎤</button>
          <textarea ref={inputRef} className="chat-input" placeholder={listening ? '🎤 Listening... tap mic when done' : 'Type or tap mic...'} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading || initializing} rows={1} style={listening ? { borderColor: 'var(--red)', background: '#ef444410' } : {}} />
          <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading || initializing}>↑</button>
        </div>
      )}
      {listening && <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: '13px', fontWeight: '600', padding: '4px 0' }}>🎤 Listening... tap mic when done, then tap send</div>}
    </div>
  );
}
