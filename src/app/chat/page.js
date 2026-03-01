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
  const [voiceMode, setVoiceMode] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const pendingTextRef = useRef('');
  const autoSendRef = useRef(false);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages, loading]);

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
      const full = (final + interim).trim();
      pendingTextRef.current = full;
      setInput(full);

      // Reset silence timer on every new word
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (autoSendRef.current && final.trim().length > 0) {
        silenceTimerRef.current = setTimeout(() => {
          // Auto-send after 2 seconds of silence
          if (pendingTextRef.current.trim()) {
            r.stop();
          }
        }, 2000);
      }
    };
    r.onend = () => {
      setListening(false);
      // Auto-send if in voice mode
      if (autoSendRef.current && pendingTextRef.current.trim()) {
        autoSendRef.current = false;
        setTimeout(() => {
          document.getElementById('auto-send-btn')?.click();
        }, 100);
      }
    };
    r.onerror = (e) => { console.error('Speech error:', e.error); setListening(false); };
    recognitionRef.current = r;
  }, []);

  const speakText = useCallback(async (text) => {
    if (!voiceEnabled || typeof window === 'undefined') return;

    setSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioContent) {
          const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
          audioRef.current = audio;
          audio.onended = () => {
            setSpeaking(false);
            audioRef.current = null;
            // Auto-listen after AI finishes speaking in voice mode
            if (voiceMode && recognitionRef.current) {
              setTimeout(() => startListening(true), 300);
            }
          };
          audio.onerror = () => { setSpeaking(false); audioRef.current = null; };
          await audio.play();
          return;
        }
      }
    } catch (err) { console.error('TTS error:', err); }

    // Fallback to browser voice
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 0.95;
      const v = window.speechSynthesis.getVoices();
      const pick = v.find(x => x.name === 'Daniel') || v.find(x => x.name.includes('Google US English')) || v.find(x => x.lang === 'en-US') || v.find(x => x.lang.startsWith('en'));
      if (pick) u.voice = pick;
      u.onend = () => {
        setSpeaking(false);
        if (voiceMode && recognitionRef.current) {
          setTimeout(() => startListening(true), 300);
        }
      };
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } else { setSpeaking(false); }
  }, [voiceEnabled, voiceMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

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

  function startListening(auto) {
    if (!recognitionRef.current || loading || initializing) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    pendingTextRef.current = '';
    setInput('');
    autoSendRef.current = !!auto;
    try { recognitionRef.current.start(); setListening(true); } catch(e) {}
  }

  function stopListening() {
    if (recognitionRef.current && listening) {
      autoSendRef.current = false;
      recognitionRef.current.stop();
      setListening(false);
    }
  }

  function toggleVoiceMode() {
    if (voiceMode) {
      setVoiceMode(false);
      stopListening();
    } else {
      setVoiceMode(true);
      setVoiceEnabled(true);
      startListening(true);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !session) return;
    if (listening && recognitionRef.current) { recognitionRef.current.stop(); setListening(false); }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const userMsg = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(''); pendingTextRef.current = ''; setLoading(true);
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
    finally { setLoading(false); }
  }

  async function endSession() {
    if (ending) return; setEnding(true);
    setVoiceMode(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (listening && recognitionRef.current) { recognitionRef.current.stop(); setListening(false); }
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
          <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } if (window.speechSynthesis) window.speechSynthesis.cancel(); setSpeaking(false); setVoiceEnabled(!voiceEnabled); }} style={{ background: voiceEnabled ? 'var(--gold)' : '#333', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '16px', cursor: 'pointer' }}>{voiceEnabled ? '🔊' : '🔇'}</button>
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
        {listening && <div className="msg system" style={{ fontSize: '12px', color: 'var(--red)' }}>🎤 Listening...</div>}
        {ending && <div className="msg system">⚡ Generating scorecard...</div>}
        <div ref={messagesEndRef} />
      </div>

      {!ending && (
        <>
          {/* Voice Mode Toggle - big button */}
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <button
              onClick={toggleVoiceMode}
              style={{
                width: voiceMode ? '80px' : '64px',
                height: voiceMode ? '80px' : '64px',
                borderRadius: '50%',
                border: voiceMode ? '3px solid var(--red)' : '3px solid var(--gold)',
                background: voiceMode ? '#ef444430' : 'var(--bg-input)',
                fontSize: voiceMode ? '32px' : '24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                animation: voiceMode ? 'pulse 1.5s infinite' : 'none',
              }}
              disabled={loading || initializing}
            >
              {voiceMode ? '🛑' : '🎙️'}
            </button>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {voiceMode ? 'Voice mode ON — speak freely, tap to stop' : 'Tap for hands-free voice mode'}
            </div>
          </div>

          {/* Text input as fallback */}
          <div className="chat-input-row">
            <button onClick={() => { if (listening) stopListening(); else startListening(false); }} style={{ width: '48px', height: '48px', border: listening ? '2px solid var(--red)' : '2px solid #333', borderRadius: '14px', background: listening ? '#ef444430' : 'var(--bg-input)', color: listening ? 'var(--red)' : 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={loading || initializing}>🎤</button>
            <textarea ref={inputRef} className="chat-input" placeholder={listening ? '🎤 Listening...' : 'Type or use voice mode...'} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading || initializing} rows={1} style={listening ? { borderColor: 'var(--red)', background: '#ef444410' } : {}} />
            <button id="auto-send-btn" className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading || initializing}>↑</button>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
