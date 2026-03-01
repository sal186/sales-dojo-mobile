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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };

        recognition.onend = () => {
          setListening(false);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Text-to-speech function
  const speakText = useCallback((text) => {
    if (!voiceEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Daniel') ||
      v.name.includes('Google US English') ||
      v.name.includes('Alex')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Load session and get first AI message
  useEffect(() => {
    const current = storage.getCurrent();
    if (!current) {
      router.push('/');
      return;
    }
    setSession(current);

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
          setTimeout(() => speakText(data.text), 500);
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
  }, [router, speakText]);

  function toggleListening() {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Try Chrome or Safari.');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setSpeaking(false);
      setInput('');
      recognitionRef.current.start();
      setListening(true);
    }
  }

  async function sendMessage() {
    const messageText = input.trim();
    if (!messageText || loading || !session) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }

    const userMsg = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    storage.saveCurrent({ ...session, messages: newMessages });

    try {
      const systemPrompt = buildRoleplayPrompt(session.scenario, session.difficulty);
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
        speakText(data.text);
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

    if (window.speechSynthesis) window.speechSynthesis.cancel();

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
          <button
            onClick={() => {
              if (window.speechSynthesis) window.speechSynthesis.cancel();
              setSpeaking(false);
              setVoiceEnabled(!voiceEnabled);
            }}
            style={{
              background: voiceEnabled ? 'var(--gold)' : '#333',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
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
            {msg.role === 'assistant' && voiceEnabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakText(msg.content);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '4px',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                🔊 Replay
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}

        {speaking && (
          <div className="msg system" style={{ fontSize: '12px' }}>
            🔊 AI buyer is speaking...
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
          <button
            onClick={toggleListening}
            className="mic-btn"
            style={{
              width: '48px',
              height: '48px',
              border: listening ? '2px solid var(--red)' : '2px solid #333',
              borderRadius: '14px',
              background: listening ? '#ef444430' : 'var(--bg-input)',
              color: listening ? 'var(--red)' : 'var(--text-muted)',
              fontSize: '20px',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            disabled={loading || initializing}
            title={listening ? 'Stop listening' : 'Speak your response'}
          >
            🎤
          </button>

          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={listening ? '🎤 Listening...' : 'Type or tap mic to speak...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || initializing}
            rows={1}
            style={listening ? { borderColor: 'var(--red)', background: '#ef444410' } : {}}
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

      {listening && (
        <div style={{
          textAlign: 'center',
          color: 'var(--red)',
          fontSize: '13px',
          fontWeight: '600',
          padding: '4px 0',
        }}>
          🎤 Listening... tap mic to stop, then send
        </div>
      )}
    </div>
  );
}
