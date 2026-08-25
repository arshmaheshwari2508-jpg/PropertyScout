import React from 'react';
import { 
  Sparkles, Compass, MapPin, Building2, Home, HelpCircle, Info, LayoutGrid, Map, ArrowRightLeft, UserCheck, RefreshCw, Heart, Calculator, Key, Sun, Moon
} from 'lucide-react';

export default function HeaderNav({
  activePersona,
  setActivePersona,
  activeView,
  setActiveView,
  selectedLocality,
  setSelectedLocality,
  onOpenModal,
  onGoHome,
  favoriteCount = 0,
  showFavoritesOnly = false,
  onToggleFavoritesOnly,
  theme = 'dark',
  onToggleTheme
}) {
  const localities = [
    'All Bengaluru', 'Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 
    'Bellandur', 'Mahadevapura', 'Hebbal', 'Sarjapur Road', 'Domlur', 
    'Malleswaram', 'Rajajinagar', 'BTM Layout', 'Jayanagar', 'JP Nagar', 
    'Electronic City', 'Yelahanka', 'Marathahalli', 'Banashankari'
  ];

  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand Masthead */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            onClick={onGoHome}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #78A1E2, #5C8BD6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(120, 161, 226, 0.45)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
          >
            <Sparkles size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                onClick={onGoHome}
                className="font-display"
                style={{ 
                  fontSize: '1.55rem', 
                  fontWeight: 900, 
                  letterSpacing: '-0.02em', 
                  color: 'var(--text-primary)', 
                  cursor: 'pointer',
                  textShadow: '0 0 20px rgba(142, 178, 235, 0.3)'
                }}
              >
                SCOUT<span style={{ color: 'var(--accent-blue-100)' }}>.AI</span>
              </span>
              <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '4px 10px', fontWeight: 800 }}>Voice-First Assistant</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Bengaluru Real Estate Scout
            </p>
          </div>

          {/* Return Home Button */}
          <button
            onClick={onGoHome}
            className="btn-secondary"
            style={{ marginLeft: '8px', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Home size={14} /> Home Page
          </button>
        </div>

        {/* Locality Selector & View Modes */}
        {activeView !== 'landing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Locality Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-canvas)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <MapPin size={16} color="var(--accent-primary)" />
              <select
                value={selectedLocality}
                onChange={(e) => setSelectedLocality(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {localities.map(loc => (
                  <option key={loc} value={loc} style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Favorites Toggle Button */}
            <button
              onClick={onToggleFavoritesOnly}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                border: showFavoritesOnly ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                background: showFavoritesOnly ? 'rgba(225, 29, 72, 0.1)' : 'var(--bg-canvas)',
                color: showFavoritesOnly ? 'var(--accent-rose)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              title="Show Saved Favorite Properties"
            >
              <Heart size={14} fill={showFavoritesOnly ? 'var(--accent-rose)' : 'none'} color={showFavoritesOnly ? 'var(--accent-rose)' : 'var(--text-secondary)'} />
              Saved ({favoriteCount})
            </button>

            {/* View Modes */}
            <div style={{ display: 'flex', background: 'var(--bg-canvas)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActiveView('command')}
                title="Voice Assistant Workspace"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeView === 'command' ? 'var(--accent-primary)' : 'transparent',
                  color: activeView === 'command' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <LayoutGrid size={14} /> Workspace
              </button>
              <button
                onClick={() => setActiveView('spatial')}
                title="Spatial Radar Map"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeView === 'spatial' ? 'var(--accent-primary)' : 'transparent',
                  color: activeView === 'spatial' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Map size={14} /> GIS Radar Map
              </button>
              <button
                onClick={() => setActiveView('compare')}
                title="Multi-Property Comparison Matrix"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeView === 'compare' ? 'var(--accent-primary)' : 'transparent',
                  color: activeView === 'compare' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowRightLeft size={14} /> Compare
              </button>
            </div>
          </div>
        )}

        {/* Persona Indicator Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {activeView !== 'landing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-canvas)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.75rem' }}>
                <Key size={13} /> AI Rental Scout
              </span>
              
              <button
                onClick={onGoHome}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Return to Home Screen"
              >
                Home
              </button>
            </div>
          )}

          {/* Info Modal Links */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={() => onOpenModal('about')} className="btn-secondary" style={{ padding: '6px 10px' }} title="About Us">
              <Info size={16} />
            </button>
            <button onClick={() => onOpenModal('how')} className="btn-secondary" style={{ padding: '6px 10px' }} title="How It Works">
              <Compass size={16} />
            </button>
            <button onClick={() => onOpenModal('faq')} className="btn-secondary" style={{ padding: '6px 10px' }} title="FAQs">
              <HelpCircle size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
