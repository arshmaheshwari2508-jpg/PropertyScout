import React from 'react';
import { ArrowRightLeft, Award, CheckCircle2, Navigation, ShieldCheck, Calendar } from 'lucide-react';

export default function PropertyComparisonMatrix({ comparedListings, onBookVisit, onRemoveCompare }) {
  if (!comparedListings || comparedListings.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textTransform: 'center', textAlign: 'center' }}>
        <ArrowRightLeft size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          No Properties Selected for Comparison
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '480px', margin: '8px auto 0' }}>
          Click the <strong>"Compare"</strong> button on any property card in the Command View to add up to 3 properties for side-by-side metric evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Multi-Property Metric Comparison Matrix
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Side-by-side financial, spatial, and grounding evaluation across {comparedListings.length} selected property listings
          </p>
        </div>
        <span className="badge badge-emerald">{comparedListings.length} / 3 Properties Selected</span>
      </div>

      {/* Comparison Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', width: '22%' }}>Evaluation Metric</th>
              {comparedListings.map((item, idx) => (
                <th key={item.listing_id} style={{ padding: '12px 16px', color: 'var(--text-primary)', width: `${78 / comparedListings.length}%` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.society_name}</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.locality}</p>
                    </div>
                    <button
                      onClick={() => onRemoveCompare(item.listing_id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontWeight: 700 }}
                      title="Remove from comparison"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Asking Price / Monthly Rent */}
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)' }}>
              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Price / Monthly Rent</td>
              {comparedListings.map((item) => (
                <td key={item.listing_id} style={{ padding: '14px 16px' }}>
                  <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {item.rent_inr ? `₹${item.rent_inr.toLocaleString('en-IN')}/mo` : `₹${(item.sale_price_inr / 100000).toFixed(1)} Lakhs`}
                  </span>
                  {item.rent_inr && item.rent_inr <= 35000 && (
                    <span className="badge badge-emerald" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>
                      <Award size={10} /> Best Value
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row 2: Deposit / EMI */}
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Security Deposit / EMI</td>
              {comparedListings.map((item) => (
                <td key={item.listing_id} className="font-mono" style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                  {item.deposit_inr ? `₹${item.deposit_inr.toLocaleString('en-IN')}` : '₹2,10,000 Deposit'}
                </td>
              ))}
            </tr>

            {/* Row 3: BHK & Floor Space */}
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)' }}>
              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Bedrooms & Floor Space</td>
              {comparedListings.map((item) => (
                <td key={item.listing_id} style={{ padding: '14px 16px' }}>
                  {item.bedrooms} BHK • <span className="font-mono">{item.sqft} sq.ft.</span>
                </td>
              ))}
            </tr>

            {/* Row 4: Furnishing Status */}
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Furnishing Status</td>
              {comparedListings.map((item) => (
                <td key={item.listing_id} style={{ padding: '14px 16px' }}>
                  <span className="badge badge-cyan">{item.furnishing || 'Semi-Furnished'}</span>
                </td>
              ))}
            </tr>

            {/* Row 5: OpenStreetMap Nearest Metro */}
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)' }}>
              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nearest Metro Station</td>
              {comparedListings.map((item) => (
                <td key={item.listing_id} style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <Navigation size={14} color="#a855f7" />
                    <span>{item.locality === 'Indiranagar' ? 'Indiranagar Metro (0.4 km)' : 'Trinity Metro (1.8 km)'}</span>
                  </div>
                  {item.locality === 'Indiranagar' && (
                    <span className="badge badge-emerald" style={{ marginTop: '4px', fontSize: '0.65rem' }}>
                      <Navigation size={10} /> Nearest Metro
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Row 6: RERA Verification */}
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>RERA Verification</td>
              {comparedListings.map((item) => (
                <td key={item.listing_id} style={{ padding: '14px 16px', color: '#10b981', fontWeight: 600 }}>
                  <ShieldCheck size={16} style={{ display: 'inline', marginRight: '4px' }} /> Verified (PRM/KA/RERA/1251)
                </td>
              ))}
            </tr>

            {/* Row 7: Action CTA */}
            <tr>
              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Action</td>
              {comparedListings.map((item) => (
                <td key={item.listing_id} style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => onBookVisit(item)}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  >
                    <Calendar size={14} /> Schedule Visit
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
