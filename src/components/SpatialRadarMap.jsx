import React, { useState } from 'react';
import { MapPin, Navigation, ShieldCheck, Compass, ExternalLink, Calendar, CheckCircle2, Zap, Layers } from 'lucide-react';

export default function SpatialRadarMap({ listings, onBookVisit, onInspectCitations }) {
  const [selectedPin, setSelectedPin] = useState(null);
  const [showMetroLines, setShowMetroLines] = useState(true);
  const [showIsochrones, setShowIsochrones] = useState(true);

  // Map locality pin coordinates relative to container
  const localityPins = [
    { id: 'indiranagar', name: 'Indiranagar', x: 42, y: 32, metro: 'Purple Line (0.4 km)', safety: '9.2 / 10' },
    { id: 'koramangala', name: 'Koramangala', x: 38, y: 56, metro: 'Trinity / Silk Board (1.8 km)', safety: '8.8 / 10' },
    { id: 'hsr', name: 'HSR Layout', x: 46, y: 72, metro: 'Upcoming Yellow Line (1.2 km)', safety: '8.6 / 10' },
    { id: 'whitefield', name: 'Whitefield', x: 78, y: 28, metro: 'Kadugodi Purple Line (0.8 km)', safety: '8.4 / 10' },
    { id: 'mahadevapura', name: 'Mahadevapura', x: 68, y: 40, metro: 'Singayyanapalya (1.1 km)', safety: '8.2 / 10' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Map Control Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Bengaluru Spatial GIS Telemetry Radar Map
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Interactive OpenStreetMap MCP geometry grid • Namma Metro Isochrones & Tech Corridor Commute Arcs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowMetroLines(!showMetroLines)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px', background: showMetroLines ? 'var(--bg-surface-hover)' : 'transparent' }}
          >
            <Navigation size={14} color="#a855f7" /> {showMetroLines ? 'Hide Metro Lines' : 'Show Metro Lines'}
          </button>
          <button
            onClick={() => setShowIsochrones(!showIsochrones)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px', background: showIsochrones ? 'var(--bg-surface-hover)' : 'transparent' }}
          >
            <Layers size={14} color="#06b6d4" /> {showIsochrones ? 'Hide 1.5km Isochrones' : 'Show 1.5km Isochrones'}
          </button>
        </div>
      </div>

      {/* Main Interactive Map Viewport */}
      <div style={{
        height: '520px',
        width: '100%',
        background: '#040810',
        borderRadius: '16px',
        border: '1px solid var(--border-glow)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)'
      }}>
        {/* Architectural Grid Lines Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(to right, rgba(0, 242, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 242, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* SVG Transit Lines & Tech Corridor Commute Arcs */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {showMetroLines && (
            <>
              {/* Namma Metro Purple Line Arc (Whitefield to MG Road/Indiranagar) */}
              <path
                d="M 780 145 L 680 208 L 420 166 L 250 180"
                fill="none"
                stroke="#a855f7"
                strokeWidth="4"
                strokeDasharray="8 4"
              />
              {/* Namma Metro Green Line Arc (North to South Silk Board) */}
              <path
                d="M 250 80 L 280 240 L 380 290 L 460 374"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeDasharray="8 4"
              />
              {/* Outer Ring Road Tech Corridor Arc */}
              <path
                d="M 420 166 Q 580 240 780 145"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </>
          )}

          {showIsochrones && (
            <>
              {/* Indiranagar 500m & 1.5km Isochrones */}
              <circle cx="42%" cy="32%" r="45" fill="rgba(6, 182, 212, 0.08)" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1.5" />
              <circle cx="42%" cy="32%" r="85" fill="none" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" strokeDasharray="3 3" />

              {/* Koramangala 500m Isochrone */}
              <circle cx="38%" cy="56%" r="50" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* Metro Station Nodes */}
        <div style={{ position: 'absolute', left: '42%', top: '32%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
          <div style={{ background: '#a855f7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', color: '#fff', fontWeight: 700 }}>
            🚇 Indiranagar Metro
          </div>
        </div>
        <div style={{ position: 'absolute', left: '78%', top: '28%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
          <div style={{ background: '#a855f7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', color: '#fff', fontWeight: 700 }}>
            🚇 Whitefield Metro
          </div>
        </div>

        {/* Locality Pin Markers */}
        {localityPins.map((pin) => (
          <div
            key={pin.id}
            onClick={() => setSelectedPin(pin)}
            style={{
              position: 'absolute',
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              zIndex: 20
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: selectedPin?.id === pin.id ? 'var(--accent-gold)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)',
              border: '2px solid #ffffff',
              transition: 'transform 0.2s'
            }}>
              <MapPin size={20} />
            </div>
            <span style={{
              background: 'rgba(7, 11, 18, 0.85)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.725rem',
              fontWeight: 700,
              display: 'block',
              marginTop: '4px',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}>
              {pin.name}
            </span>
          </div>
        ))}

        {/* Floating Scout Dossier Modal Popup */}
        {selectedPin && (
          <div className="glass-panel" style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            maxWidth: '420px',
            padding: '16px',
            zIndex: 30,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h4 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedPin.name} Locality Dossier
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>OpenStreetMap MCP Spatial Geometry</p>
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.775rem', marginBottom: '12px' }}>
              <div style={{ background: 'var(--bg-canvas)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nearest Metro:</span>
                <p style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{selectedPin.metro}</p>
              </div>
              <div style={{ background: 'var(--bg-canvas)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Safety Audit:</span>
                <p style={{ fontWeight: 600, color: '#10b981' }}>{selectedPin.safety}</p>
              </div>
            </div>

            <button
              onClick={() => onInspectCitations('SRC_OSM_MCP')}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
            >
              Inspect Locality RAG Citations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
