import React from 'react';
import { Layers, ShieldCheck, Compass, Sparkles, Navigation, Zap, Palette, FileText, CheckCircle2 } from 'lucide-react';

export default function DesignSystemShowcase() {
  return (
    <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Title Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Palette size={24} color="var(--accent-primary)" />
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            SCOUT.AI — 4-Layer RAG Architecture Specification & Design System
          </h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Grounding Engine Blueprint • 4-Layer Knowledge Matrix • Light Design Tokens • n8n Automation Engine
        </p>
      </div>

      {/* Section 1: 4-Layer Separation Matrix */}
      <div>
        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          1. System Architecture & 4-Layer Separation Matrix
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          To prevent hallucination in real estate intelligence, SCOUT.AI enforces strict mathematical separation across four dedicated knowledge layers:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Layer 1 */}
          <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="badge badge-emerald">Layer 1</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FastEmbed 384-dim</span>
            </div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>bengaluru.rent (Dynamic Catalog)</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Source of truth for asking prices, rents, BHK, sqft, deposit terms, and active availability. (RAG vector store is NEVER queried for prices).
            </p>
          </div>

          {/* Layer 2 */}
          <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="badge badge-cyan">Layer 2</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ChromaDB Vector Store</span>
            </div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>localities.jsonl (Locality Context)</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Curated municipal gazettes and urban planning records. Ingested for historical context, appreciation CAGR, and neighborhood character.
            </p>
          </div>

          {/* Layer 3 */}
          <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="badge badge-rose">Layer 3</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Empirical Audit</span>
            </div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>safety_sources (Safety Evidence)</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Strict non-binary safety policy. Prohibits binary "safe" / "unsafe" assertions. Outputs empirical street lighting index and jurisdictional police stats.
            </p>
          </div>

          {/* Layer 4 */}
          <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="badge badge-gold">Layer 4</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OpenStreetMap MCP</span>
            </div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>OpenStreetMap MCP (Spatial GIS)</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Real-time spatial coordinate routing, isochrone walking distances to Namma Metro lines, and commute drive times to tech corridors.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Typography & Monospaced Specimen */}
      <div>
        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          2. Typography Scale & Monospaced Specimen
        </h3>
        <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Display Font (Outfit / Playfair Display):</span>
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Voice-First AI Property Scout</h1>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Body Copy (Inter):</span>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Grounded, non-hallucinating real estate intelligence engineered for Bengaluru property markets.
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monospaced Tabular Figures (JetBrains Mono):</span>
            <p className="font-mono" style={{ fontSize: '1rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              ₹38,000/mo • 1,250 sq.ft. • 2.4 km Metro • RERA PRM/KA/1251
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
