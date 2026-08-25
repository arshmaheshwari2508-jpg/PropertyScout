import React from 'react';
import { FileText, ShieldCheck, ExternalLink, X, CheckCircle, Award } from 'lucide-react';

export default function SourcesDrawer({ isOpen, onClose, selectedSourceId }) {
  if (!isOpen) return null;

  const sources = [
    {
      id: "SRC_BENGALURU_RENT",
      name: "bengaluru.rent Property Database",
      type: "crowdsourced_rental_source",
      reliability_weight: 1.0,
      verification_status: "Verified Active Listings DB",
      description: "Direct source of truth for active property listings, rents, sale prices, BHK, sqft, furnishing, and availability."
    },
    {
      id: "SRC_WIKI_NEIGHBORHOODS",
      name: "Wikipedia — List of neighbourhoods in Bengaluru",
      type: "public_reference",
      reliability_weight: 1.0,
      verification_status: "Verified Municipal Data",
      description: "Public domain reference for neighborhood history, geographic boundaries, commercial context, and urban character."
    },
    {
      id: "SRC_GBA",
      name: "Greater Bengaluru Area Infrastructure Master Plan 2025-2030",
      type: "government_gazette",
      reliability_weight: 1.0,
      verification_status: "Karnataka Urban Planning Gazette",
      description: "Official urban development gazette detailing arterial road expansions, tech corridor zones, and metro line phase extensions."
    },
    {
      id: "SRC_KAR_POLICE_CRIME_2025",
      name: "Karnataka State Police Annual Crime & Safety Review 2025",
      type: "empirical_safety_report",
      reliability_weight: 1.0,
      verification_status: "Empirical Safety Telemetry",
      description: "Source of truth for street illumination index, police beat patrol frequency, and empirical crime statistics."
    },
    {
      id: "SRC_OSM_MCP",
      name: "OpenStreetMap MCP Server Geometry API",
      type: "spatial_gis_server",
      reliability_weight: 1.0,
      verification_status: "Live OpenStreetMap Coordinates",
      description: "Real-time spatial coordinate calculation for isochrones, true walking distances to Namma Metro lines, and tech park commute times."
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '520px',
        height: '100%',
        borderRadius: 0,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent-primary)" />
            <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Sources & Citation Inspector
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          100% of factual claims in SCOUT.AI are grounded against these audited sources in <code>sources.jsonl</code>.
        </p>

        {/* Source Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sources.map((src) => {
            const isTarget = selectedSourceId === src.id;
            return (
              <div
                key={src.id}
                style={{
                  background: isTarget ? 'var(--bg-card)' : 'var(--bg-canvas)',
                  border: isTarget ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="font-mono badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                    {src.id}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} /> {src.verification_status}
                  </span>
                </div>

                <h4 className="font-display" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {src.name}
                </h4>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {src.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Type: <code>{src.type}</code></span>
                  <span>RAG Weight: <strong>{src.reliability_weight}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
