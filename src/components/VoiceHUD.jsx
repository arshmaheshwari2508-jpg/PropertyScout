import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Send, Volume2, Square, RotateCcw, Radio, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import PropertyScoutMascot from './PropertyScoutMascot';

export default function VoiceHUD({
  activePersona,
  onProcessQuery,
  transcriptHistory,
  isListening,
  setIsListening,
  isPlayingAudio,
  onStopVoice,
  onStartListening,
  onResetSession,
  postDiscoveryResume = false,
  voiceBookingActive = false
}) {
  const [inputValue, setInputValue] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [transcriptHistory, isChatExpanded]);

  const toggleListening = () => {
    if (isPlayingAudio) {
      if (onStopVoice) onStopVoice();
      return;
    }

    if (isListening) {
      if (onStopVoice) onStopVoice();
      setIsListening(false);
      return;
    }

    if (onStartListening) {
      const isFirstGreeting = transcriptHistory.length === 0;
      const resumeSiteVisit = postDiscoveryResume && !voiceBookingActive && !isFirstGreeting;
      onStartListening(isFirstGreeting, resumeSiteVisit, voiceBookingActive);
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
      transition: 'all 0.3s ease',
      overflow: 'visible'
    }}>
      {/* Voice Agent HUD — mascot sits upright over the Speak button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'linear-gradient(135deg, rgba(142, 178, 235, 0.06) 0%, transparent 55%)',
        borderRadius: '16px',
        padding: '12px 8px 16px',
        margin: '-4px -4px 0',
        overflow: 'visible'
      }}>
        <div style={{ flex: 1, minWidth: 0, paddingBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Property Scout
            </h2>
            {isListening && (
              <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={12} className="animate-pulse" /> Listening...
              </span>
            )}
            {isPlayingAudio && (
              <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Volume2 size={12} /> Speaking...
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
            {postDiscoveryResume && !isListening && !isPlayingAudio
              ? 'Explore listings below, then tap Speak to book a site visit'
              : 'Your AI rental assistant — tap Speak when you\'re ready'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexShrink: 0 }}>
          {onResetSession && (
            <button
              onClick={() => onResetSession()}
              style={{
                padding: '8px 14px',
                borderRadius: '14px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(120, 161, 226, 0.12)',
                color: 'var(--accent-blue-100)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                marginBottom: '10px'
              }}
              title="Start a Fresh Session"
            >
              <RotateCcw size={14} /> New Session
            </button>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            <PropertyScoutMascot
              size="md"
              showBadge={false}
              listening={isListening}
              speaking={isPlayingAudio}
            />
            <button
              id="hud-mic-button"
              onClick={toggleListening}
              className="scout-speak-cta"
              style={{
                padding: '14px 24px',
                borderRadius: '16px',
                border: 'none',
                background: isPlayingAudio ? 'var(--accent-rose)' : isListening ? '#10b981' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: isListening
                  ? '0 8px 28px rgba(16, 185, 129, 0.4)'
                  : '0 8px 28px rgba(220, 38, 38, 0.4)',
                transition: 'all 0.25s ease',
                minWidth: '156px',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 3,
                marginTop: '-22px'
              }}
              title="Tap to speak with Property Scout"
            >
              {isPlayingAudio ? (
                <>
                  <Square size={18} fill="#ffffff" /> Stop Voice
                </>
              ) : isListening ? (
                <>
                  <MicOff size={18} /> Listening...
                </>
              ) : (
                <>
                  <Mic size={18} /> Speak
                </>
              )}
            </button>
          </div>
        </div>
      </div>

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
          {transcriptHistory.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
              Tap <strong>Speak</strong> to start your property search.
            </p>
          ) : (
            transcriptHistory.map((msg, index) => (
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
            ))
          )}
        </div>
      )}

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
