import React, { useEffect, useState } from 'react';
import { FileText, ShieldCheck, X } from 'lucide-react';
import { apiUrl } from '../utils/apiBase';

const FALLBACK_SOURCES = [
  {
    source_id: 'SRC_BENGALURU_RENT',
    name: 'bengaluru.rent',
    type: 'crowdsourced_rental_source',
    role: 'rental_listing_and_rent_context',
  },
  {
    source_id: 'SRC_WIKI_NEIGHBORHOODS',
    name: 'Wikipedia — List of neighbourhoods in Bengaluru',
    type: 'public_reference',
    role: 'locality_taxonomy_and_broad_context',
  },
  {
    source_id: 'SRC_OSM_MCP',
    name: 'OpenStreetMap MCP',
    type: 'geospatial_tool',
    role: 'live_or_query_time_geospatial_information',
  },
  {
    source_id: 'SRC_KAR_POLICE_CRIME_2025',
    name: 'Karnataka Open Government Data — Crime Review 2025',
    type: 'official_government_dataset',
    role: 'crime_and_safety_evidence',
  },
];

export default function SourcesDrawer({ isOpen, onClose, selectedSourceId }) {
  const [sources, setSources] = useState(FALLBACK_SOURCES);

  useEffect(() => {
    if (!isOpen) return;
    fetch(apiUrl('/api/sources'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sources?.length) setSources(data.sources);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

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
          Factual claims in Property Scout are tied to audited sources in <code>Docs/sources.jsonl</code>.
          Metro distances and safety context cite <code>SRC_OSM_MCP</code> and <code>SRC_KAR_POLICE_CRIME_2025</code>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sources.map((src) => {
            const id = src.source_id || src.id;
            const isTarget = selectedSourceId === id;
            return (
              <div
                key={id}
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
                    {id}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} /> Verified taxonomy
                  </span>
                </div>

                <h4 className="font-display" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {src.name}
                </h4>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {src.role || src.description || src.reliability_note || 'Grounding source for RAG and citations.'}
                </p>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Type: <code>{src.type}</code>
                  {src.verified ? ` • Verified ${src.verified}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
