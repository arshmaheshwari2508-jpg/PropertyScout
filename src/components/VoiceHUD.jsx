import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Send, Volume2, Square, Sparkles, Building2, UserCheck, Tag, DollarSign, RotateCcw, Radio, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';

export default function VoiceHUD({
  activePersona,
  onProcessQuery,
  transcriptHistory,
  isListening,
  setIsListening,
  isPlayingAudio,
  onStopVoice,
  onStartListening,
  onSpeakGreeting
}) {
  const [inputValue, setInputValue] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatContainerRef = useRef(null);

  // Scoped scroll inside chat container ONLY (prevents window scrolling downwards!)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [transcriptHistory, isChatExpanded]);

  const toggleListening = () => {
    // If agent is currently speaking, click stops speech and starts listening
    if (isPlayingAudio) {
      if (onStopVoice) onStopVoice();
      if (onStartListening) onStartListening(false);
      return;
    }

    // If currently listening, click stops listening
    if (isListening) {
      if (onStopVoice) onStopVoice();
      setIsListening(false);
      return;
    }

    // Always request microphone permission FIRST before greeting or listening!
    if (onStartListening) {
      const isFirstGreeting = transcriptHistory.length <= 1;
      onStartListening(isFirstGreeting);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onProcessQuery(inputValue, true);
    setInputValue('');
  };

  const handleShortcutClick = (text) => {
    onProcessQuery(text, true);
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      border: isListening ? '2px solid var(--accent-emerald)' : isPlayingAudio ? '2px solid var(--accent-gold)' : '2px solid var(--border-subtle)',
      boxShadow: isListening ? '0 0 24px rgba(16, 185, 129, 0.25)' : isPlayingAudio ? '0 0 24px rgba(217, 119, 6, 0.25)' : 'var(--shadow-subtle)',
      borderRadius: '20px',
      background: 'var(--bg-card)',
      transition: 'all 0.3s ease'
    }}>
      {/* Voice Agent HUD Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            position: 'relative',
            width: '50px',
            height: '50px',
            borderRadius: '16px',
            background: isListening ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, var(--accent-gold), #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img
              src="/mascot.png"
              alt="SCOUT Agent Mascot"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80";
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                SCOUT AI Agent
              </h2>
              {isListening && <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Radio size={12} className="animate-pulse" /> Listening...</span>}
              {isPlayingAudio && <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Volume2 size={12} /> Speaking...</span>}
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Touch to Speak with SCOUT Voice Agent
            </p>
          </div>
        </div>

        {/* Mic / SCOUT Agent Touch to Speak Button */}
        <button
          id="hud-mic-button"
          onClick={toggleListening}
          style={{
            padding: '10px 20px',
            borderRadius: '16px',
            border: 'none',
            background: isPlayingAudio ? 'var(--accent-rose)' : isListening ? '#10b981' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 6px 20px rgba(220, 38, 38, 0.3)',
            transition: 'all 0.25s ease'
          }}
          title="Click to speak with SCOUT AI Agent"
        >
          {/* SCOUT Mascot Image Avatar */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#ffffff',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img
              src="/mascot.png"
              alt="SCOUT Agent"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80";
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
          </div>

          {isPlayingAudio ? (
            <>
              <Square size={16} fill="#ffffff" /> Stop Voice
            </>
          ) : isListening ? (
            <>
              <MicOff size={16} /> Listening...
            </>
          ) : (
            <>
              <Mic size={16} /> Touch to Speak
            </>
          )}
        </button>
      </div>

      {/* Expand / Collapse Conversation Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setIsChatExpanded(!isChatExpanded)}
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MessageSquare size={14} />
          {isChatExpanded ? 'Hide Chat History' : 'Show Chat History & Transcription'}
          {isChatExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Collapsible Chat Log Log */}
      {isChatExpanded && (
        <div
          ref={chatContainerRef}
          id="hud-chat-box"
          style={{
            height: '200px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '6px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px'
          }}
        >
          {transcriptHistory.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-canvas)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {/* Voice Shortcut Chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {activePersona !== 'Seller' ? (
          <>
            <button onClick={() => handleShortcutClick("Find 2BHK in Indiranagar under 45k")} className="chip" style={{ fontSize: '0.725rem' }}>
              🔍 Rent Indiranagar
            </button>
            <button onClick={() => handleShortcutClick("Find 2BHK in Koramangala under 40k")} className="chip" style={{ fontSize: '0.725rem' }}>
              🔍 Rent Koramangala
            </button>
            <button onClick={() => handleShortcutClick("Properties near Metro Station")} className="chip" style={{ fontSize: '0.725rem' }}>
              🚇 Near Metro
            </button>
          </>
        ) : (
          <>
            <button onClick={() => handleShortcutClick("I want to list my 2BHK flat for rent")} className="chip" style={{ fontSize: '0.725rem' }}>
              + List My Property
            </button>
            <button onClick={() => handleShortcutClick("What rents are other flats listed at in Koramangala?")} className="chip" style={{ fontSize: '0.725rem' }}>
              📈 Koramangala Rents
            </button>
          </>
        )}
      </div>

      {/* Text Input Fallback */}
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          id="hud-text-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={activePersona !== 'Seller' ? "Type your query (e.g. 2BHK under 40,000 rupees)..." : "Type your listing details..."}
          style={{
            flex: 1,
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button id="hud-send-button" type="submit" className="btn-primary" style={{ padding: '10px 16px', borderRadius: '12px' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
