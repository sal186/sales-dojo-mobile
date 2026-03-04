'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { buildRoleplayPrompt, buildScorecardPrompt, getRandomPersona } from '@/lib/prompts';

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
  const [persona, setPersona] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const pendingTextRef = useRef('');
  const autoSendRef = useRef(false);
  const voiceModeRef = useRef(false);
  const personaRef = useRef(null);
  const isNativeRef = useRef(false);
  const nativePluginRef = useRef(null);
  const listeningRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { personaRef.current = persona; }, [persona]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Initialize speech recognition — native on iOS/Capacitor, web on desktop
  useEffect(() => {
    if (typeof window === 'undefined') return;

    var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    isNativeRef.current = isNative;

    if (isNative) {
      import('@capacitor-community/speech-recognition').then(function(mod) {
        var SpeechRecognition = mod.SpeechRecognition;
        nativePluginRef.current = SpeechRecognition;
        SpeechRecognition.requestPermissions().catch(function() {});

        SpeechRecognition.addListener('partialResults', function(data) {
          if (data && data.matches && data.matches.length > 0) {
            var text = data.matches[0];
            pendingTextRef.current = text;
            setInput(text);

            // Reset silence timer on every new result
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (autoSendRef.current && text.trim().length > 0) {
              silenceTimerRef.current = setTimeout(function() {
                if (pendingTextRef.current.trim() && !loadingRef.current) {
                  shouldRestartRef.current = false;
                  doStopAndSend();
                }
              }, 2500);
            }
          }
        });

        SpeechRecognition.addListener('listeningState', function(data) {
          if (data && data.status === 'stopped') {
            listeningRef.current = false;
            setListening(false);

            // KEY FIX: Always try to send pending text when recognition stops
            if (pendingTextRef.current.trim() && autoSendRef.current && !loadingRef.current) {
              autoSendRef.current = false;
              shouldRestartRef.current = false;
              setTimeout(function() {
                var btn = document.getElementById('auto-send-btn');
                if (btn && pendingTextRef.current.trim()) btn.click();
              }, 150);
              return;
            }

            // Auto-restart in voice mode if no text to send
            if (shouldRestartRef.current && voiceModeRef.current && !loadingRef.current) {
              setTimeout(function() {
                if (voiceModeRef.current && !listeningRef.current && !loadingRef.current) {
                  doStartListeningInternal(true);
                }
              }, 500);
            }
          }
        });
      }).catch(function(err) {
        console.log('Native speech plugin not available, falling back to web', err);
        isNativeRef.current = false;
        initWebSpeech();
      });
    } else {
      initWebSpeech();
    }
  }, []);

  function doStopAndSend() {
    if (isNativeRef.current && nativePluginRef.current) {
      nativePluginRef.current.stop().then(function() {
        autoSendRef.current = false;
        setTimeout(function() {
          var btn = document.getElementById('auto-send-btn');
          if (btn && pendingTextRef.current.trim()) btn.click();
        }, 150);
      }).catch(function() {
        autoSendRef.current = false;
        setTimeout(function() {
          var btn = document.getElementById('auto-send-btn');
          if (btn && pendingTextRef.current.trim()) btn.click();
        }, 150);
      });
    }
  }

  function initWebSpeech() {
    if (typeof window === 'undefined') return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    var r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.maxAlternatives = 1;

    r.onresult = function(event) {
      var f = '', interim = '';
      for (var i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) f += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      var full = (f + interim).trim();
      pendingTextRef.current = full;
      setInput(full);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (autoSendRef.current && f.trim().length > 0) {
        silenceTimerRef.current = setTimeout(function() {
          if (pendingTextRef.current.trim()) {
            shouldRestartRef.current = false;
            try { r.stop(); } catch(e) {}
          }
        }, 2000);
      }
    };

    r.onend = function() {
      listeningRef.current = false;
      setListening(false);
      if (autoSendRef.current && pendingTextRef.current.trim()) {
        autoSendRef.current = false;
        shouldRestartRef.current = false;
        setTimeout(function() {
          var btn = document.getElementById('auto-send-btn');
          if (btn) btn.click();
        }, 100);
        return;
      }
      if (shouldRestartRef.current && voiceModeRef.current) {
        setTimeout(function() {
          if (voiceModeRef.current && !listeningRef.current) {
            doStartListeningInternal(true);
          }
        }, 300);
      }
    };

    r.onerror = function(event) {
      listeningRef.current = false;
      setListening(false);
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
        if (voiceModeRef.current && shouldRestartRef.current) {
          setTimeout(function() {
            if (voiceModeRef.current && !listeningRef.current) {
              doStartListeningInternal(true);
            }
          }, 500);
        }
      }
    };

    recognitionRef.current = r;
  }

  function doStartListeningInternal(auto) {
    if (loadingRef.current || initializing) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    pendingTextRef.current = '';
    setInput('');
    autoSendRef.current = !!auto;
    shouldRestartRef.current = !!auto;

    if (isNativeRef.current && nativePluginRef.current) {
      nativePluginRef.current.start({
        language: 'en-US',
        partialResults: true,
        popup: false,
      }).then(function() {
        listeningRef.current = true;
        setListening(true);
      }).catch(function(err) {
        console.log('Native speech start error:', err);
        if (voiceModeRef.current && shouldRestartRef.current) {
          setTimeout(function() {
            if (voiceModeRef.current && !listeningRef.current) {
              doStartListeningInternal(true);
            }
          }, 1000);
        }
      });
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        listeningRef.current = true;
        setListening(true);
      } catch(e) {
        try {
          recognitionRef.current.stop();
          setTimeout(function() {
            try {
              recognitionRef.current.start();
              listeningRef.current = true;
              setListening(true);
            } catch(e2) {}
          }, 300);
        } catch(e2) {}
      }
    }
  }

  // Voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
    }
  }, []);

  function doSpeak(text, gender) {
    if (!voiceEnabled || typeof window === 'undefined') return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(true);

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, gender: gender || 'male' }),
    })
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(data) {
      if (data && data.audioContent) {
        var audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
        audioRef.current = audio;
        audio.onended = function() {
          setSpeaking(false);
          audioRef.current = null;
          if (voiceModeRef.current) {
            setTimeout(function() { doStartListeningInternal(true); }, 500);
          }
        };
        audio.onerror = function() { setSpeaking(false); audioRef.current = null; };
        audio.play().catch(function() {
          doFallbackSpeak(text, gender);
        });
      } else {
        doFallbackSpeak(text, gender);
      }
    })
    .catch(function() { doFallbackSpeak(text, gender); });
  }

  function doFallbackSpeak(text, gender) {
    if (typeof window === 'undefined' || !window.speechSynthesis) { setSpeaking(false); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = gender === 'female' ? 1.1 : 0.9;
    var v = window.speechSynthesis.getVoices();
    var pick = null;
    if (gender === 'female') {
      pick = v.find(function(x) { return x.name === 'Samantha'; }) || v.find(function(x) { return x.lang === 'en-US'; });
    } else {
      pick = v.find(function(x) { return x.name === 'Daniel'; }) || v.find(function(x) { return x.lang === 'en-US'; });
    }
    if (pick) u.voice = pick;
    u.onend = function() {
      setSpeaking(false);
      if (voiceModeRef.current) {
        setTimeout(function() { doStartListeningInternal(true); }, 500);
      }
    };
    u.onerror = function() { setSpeaking(false); };
    window.speechSynthesis.speak(u);
  }

  function doStartListening(auto) {
    doStartListeningInternal(auto);
  }

  function doStopListening() {
    shouldRestartRef.current = false;
    autoSendRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (isNativeRef.current && nativePluginRef.current) {
      nativePluginRef.current.stop().catch(function() {});
      listeningRef.current = false;
      setListening(false);
    } else if (recognitionRef.current && listeningRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      listeningRef.current = false;
      setListening(false);
    }
  }

  function doCleanupAndExit() {
    setVoiceMode(false);
    shouldRestartRef.current = false;
    autoSendRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    if (isNativeRef.current && nativePluginRef.current) {
      nativePluginRef.current.stop().catch(function() {});
    } else if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    listeningRef.current = false;
    setListening(false);
    setSpeaking(false);
    router.push('/');
  }

  // Load session
  useEffect(() => {
    var current = storage.getCurrent();
    if (!current) { router.push('/'); return; }
    setSession(current);

    var p = null;
    try { p = current.persona; } catch(e) {}
    if (!p || !p.name) { p = getRandomPersona(); }
    setPersona(p);
    personaRef.current = p;

    if (current.messages && current.messages.length > 0) {
      setMessages(current.messages);
      setInitializing(false);
    } else {
      var sp = buildRoleplayPrompt(current.scenario, current.difficulty, p);
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Begin the roleplay. Give your opening line as the buyer.' }], systemPrompt: sp, mode: 'roleplay' }),
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.text) {
          var aiMsg = { role: 'assistant', content: data.text };
          setMessages([aiMsg]);
          try { storage.saveCurrent({ scenario: current.scenario, difficulty: current.difficulty, persona: p, messages: [aiMsg], startedAt: current.startedAt }); } catch(e) {}
          setTimeout(function() { doSpeak(data.text, p.gender); }, 500);
        }
        setInitializing(false);
      })
      .catch(function() { setInitializing(false); });
    }
  }, []);

  function doSend() {
    var text = input.trim();
    if (!text || loading || !session) return;
    shouldRestartRef.current = false;
    if (listening) {
      if (isNativeRef.current && nativePluginRef.current) {
        nativePluginRef.current.stop().catch(function() {});
      } else if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      listeningRef.current = false;
      setListening(false);
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    var userMsg = { role: 'user', content: text };
    var newMsgs = messages.concat([userMsg]);
    setMessages(newMsgs);
    setInput('');
    pendingTextRef.current = '';
    setLoading(true);

    var p = personaRef.current;
    var sp = buildRoleplayPrompt(session.scenario, session.difficulty, p);
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMsgs.map(function(m) { return { role: m.role, content: m.content }; }), systemPrompt: sp, mode: 'roleplay' }),
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.text) {
        var aiMsg = { role: 'assistant', content: data.text };
        var updated = newMsgs.concat([aiMsg]);
        setMessages(updated);
        try { storage.saveCurrent({ scenario: session.scenario, difficulty: session.difficulty, persona: p, messages: updated, startedAt: session.startedAt }); } catch(e) {}
        doSpeak(data.text, p ? p.gender : 'male');
      }
      setLoading(false);
    })
    .catch(function() { setLoading(false); });
  }

  function doEnd() {
    if (ending) return;
    setEnding(true);
    setVoiceMode(false);
    shouldRestartRef.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    if (listening) {
      if (isNativeRef.current && nativePluginRef.current) {
        nativePluginRef.current.stop().catch(function() {});
      } else if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      listeningRef.current = false;
      setListening(false);
    }
    var sellerMsgs = messages.filter(function(m) { return m.role === 'user'; });
    if (sellerMsgs.length < 2) { alert('Need at least 2 responses to generate a scorecard.'); setEnding(false); return; }
    var sp = buildScorecardPrompt(session.scenario, session.difficulty, messages);
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Generate the scorecard now.' }], systemPrompt: sp, mode: 'scorecard' }),
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var scorecard;
      try {
        var c = data.text.trim();
        if (c.startsWith('`')) c = c.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        scorecard = JSON.parse(c);
      } catch(e) {
        scorecard = { overallScore: 50, grade: 'C', dimensions: { empathy: { score: 50, summary: 'N/A' }, objectionHandling: { score: 50, summary: 'N/A' }, clarity: { score: 50, summary: 'N/A' }, closingTechnique: { score: 50, summary: 'N/A' }, activeListening: { score: 50, summary: 'N/A' } }, strengths: [], improvements: [] };
      }
      var done = { scenario: session.scenario, difficulty: session.difficulty, messages: messages, scorecard: scorecard, startedAt: session.startedAt, endedAt: Date.now() };
      storage.saveSession(done);
      storage.saveCurrent(Object.assign({}, done, { scorecard: scorecard }));
      router.push('/scorecard');
    })
    .catch(function() { setEnding(false); });
  }

  function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } }
  if (!session) return null;

  var turnCount = messages.filter(function(m) { return m.role === 'user'; }).length;
  var personaLabel = (persona && persona.name) ? (persona.name + ', ' + persona.title) : 'AI Buyer';

  return (
    <div className="container" style={{ paddingBottom: '16px' }}>
      <div className="chat-header" style={{ flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button onClick={doCleanupAndExit} style={{ background: 'transparent', border: '1px solid #444', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px', padding: '2px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>←</button>
          <div className="chat-persona">{personaLabel}</div>
          <button className="end-btn" onClick={doEnd} disabled={ending}>{ending ? 'Scoring...' : 'End & Score'}</button>
  </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <span className="chat-turns">Turn {turnCount}</span>
          <span className={'chat-diff ' + session.difficulty}>{session.difficulty}</span>
          <button onClick={function() { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); setSpeaking(false); setVoiceEnabled(!voiceEnabled); }} style={{ background: voiceEnabled ? 'var(--gold)' : '#333', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '16px', cursor: 'pointer' }}>{voiceEnabled ? '🔊' : '🔇'}</button>
        </div>
      </div>
      <div className="msg system">{session.scenario}</div>
      <div className="chat-messages">
        {initializing && <div className="typing-indicator"><span></span><span></span><span></span></div>}
        {messages.map(function(msg, i) {
          return (
            <div key={i} className={'msg ' + (msg.role === 'user' ? 'user' : 'ai')}>
              {msg.content}
              {msg.role === 'assistant' && voiceEnabled && (
                <button onClick={function() { doSpeak(msg.content, persona ? persona.gender : 'male'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', padding: '4px', marginTop: '4px', display: 'block' }}>🔊 Replay</button>
              )}
            </div>
          );
        })}
        {loading && <div className="typing-indicator"><span></span><span></span><span></span></div>}
        {speaking && <div className="msg system" style={{ fontSize: '12px' }}>🔊 Speaking...</div>}
        {listening && <div className="msg system" style={{ fontSize: '12px', color: 'var(--red)' }}>🎤 Listening...</div>}
        {ending && <div className="msg system">Generating scorecard...</div>}
        <div ref={messagesEndRef} />
      </div>
      {!ending && (
        <div>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <button onClick={function() { if (voiceMode) { setVoiceMode(false); doStopListening(); } else { setVoiceMode(true); setVoiceEnabled(true); doStartListening(true); } }} style={{ width: voiceMode ? '80px' : '64px', height: voiceMode ? '80px' : '64px', borderRadius: '50%', border: voiceMode ? '3px solid var(--red)' : '3px solid var(--gold)', background: voiceMode ? '#ef444430' : 'var(--bg-input)', fontSize: voiceMode ? '32px' : '24px', cursor: 'pointer' }} disabled={loading || initializing}>{voiceMode ? '🛑' : '🎙️'}</button>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{voiceMode ? 'Voice mode ON — speak freely' : 'Tap for hands-free voice mode'}</div>
          </div>
          <div className="chat-input-row">
            <button onClick={function() { if (listening) doStopListening(); else doStartListening(false); }} style={{ width: '48px', height: '48px', border: listening ? '2px solid var(--red)' : '2px solid #333', borderRadius: '14px', background: listening ? '#ef444430' : 'var(--bg-input)', color: listening ? 'var(--red)' : 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={loading || initializing}>🎤</button>
            <textarea ref={inputRef} className="chat-input" placeholder={listening ? '🎤 Listening...' : 'Type or use voice mode...'} value={input} onChange={function(e) { setInput(e.target.value); }} onKeyDown={handleKeyDown} disabled={loading || initializing} rows={1} style={listening ? { borderColor: 'var(--red)', background: '#ef444410' } : {}} />
            <button id="auto-send-btn" className="send-btn" onClick={doSend} disabled={!input.trim() || loading || initializing}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
}
