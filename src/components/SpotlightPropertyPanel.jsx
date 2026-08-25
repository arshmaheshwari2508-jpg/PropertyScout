import React from 'react';
import { 
  Building2, MapPin, BedDouble, Maximize2, ShieldCheck, Sparkles, Dumbbell, Shield, ParkingCircle, Zap, Waves, User, Phone, CheckCircle2
} from 'lucide-react';

export default function SpotlightPropertyPanel({ property, scoutReason, onBookVisit }) {
  if (!property) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Sparkles size={24} style={{ color: 'var(--accent-primary)', marginBottom: '8px' }} />
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Select any property listing to view detailed Scout intelligence here.</p>
      </div>
    );
  }

  const isSale = property.listing_type === 'sale';
  const priceDisplay = isSale
    ? `₹${(property.sale_price_inr / 10000000).toFixed(2)} Cr`
    : `₹${property.rent_inr?.toLocaleString('en-IN')}/mo`;

  // Standard amenities dictionary
  const amenities = property.amenities || [
    "Covered Parking", "Gym", "Power Backup", "24/7 Security", "Swimming Pool"
  ];

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      borderRadius: '20px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      maxHeight: '780px',
      overflowY: 'auto'
    }}>
      {/* Title Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 10px', borderRadius: '99px', marginBottom: '8px' }}>
          <Sparkles size={13} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Scout Property Spotlight
          </span>
        </div>

        <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {property.society_name}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <MapPin size={14} color="var(--accent-rose)" />
          <span>{property.locality}, Bengaluru</span>
        </div>
      </div>

      {/* Action Badges */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <span className={`badge ${isSale ? 'badge-amber' : 'badge-emerald'}`}>
          {isSale ? 'FOR SALE' : 'FOR RENT'}
        </span>
        <span className="badge badge-sky">
          {property.bedrooms} BHK Spec
        </span>
        <span className="badge badge-purple" style={{ background: 'rgba(147, 51, 234, 0.1)', color: 'rgb(147, 51, 234)', border: 'none' }}>
          RERA Verified
        </span>
      </div>

      {/* Highlight Recommendation Reason */}
      {scoutReason && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(2, 132, 199, 0.08))',
          borderLeft: '4px solid var(--accent-primary)',
          padding: '14px 18px',
          borderRadius: '0 12px 12px 0',
          fontSize: '0.85rem',
          color: 'var(--text-primary)',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.04)'
        }}>
          <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
            ✨ Why Scout Recommends This
          </span>
          <span style={{ fontWeight: 600, lineHeight: 1.45 }}>{scoutReason}</span>
        </div>
      )}

      {/* Specifications Table Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        background: 'var(--bg-canvas)',
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            {isSale ? 'Sale Value' : 'Monthly Rent'}
          </span>
          <p className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', margin: 0 }}>
            {priceDisplay}
          </p>
        </div>

        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            {isSale ? 'Est. Downpayment' : 'Refundable Deposit'}
          </span>
          <p className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {isSale ? `₹${(property.sale_price_inr * 0.2 / 100000).toFixed(2)} Lakhs (20%)` : `₹${(property.deposit_inr || property.rent_inr * 6).toLocaleString('en-IN')}`}
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Super Area</span>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {property.sqft} sq.ft.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Furnishing</span>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {property.furnishing || 'Semi-Furnished'}
          </p>
        </div>
      </div>

      {/* Property Description */}
      <div>
        <h4 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Property Summary
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
          {property.description}
        </p>
      </div>

      {/* Verified Amenities */}
      <div>
        <h4 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Amenities & Features
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {amenities.map((item, idx) => (
            <span key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.775rem',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              <CheckCircle2 size={13} color="var(--accent-primary)" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Assigned licensed property broker */}
      <div style={{
        borderTop: '1px dashed var(--border-subtle)',
        paddingTop: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <h4 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Assigned licensed broker
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', background: 'var(--bg-canvas)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '99px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(2, 132, 199, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Amit Patel</p>
              <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--text-secondary)' }}>SCOUT Lead Broker</p>
            </div>
          </div>
          <a href="tel:+919876511001" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '99px',
            background: 'var(--accent-primary)',
            color: '#ffffff',
            cursor: 'pointer'
          }}>
            <Phone size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
