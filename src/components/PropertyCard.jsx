import React, { useState } from 'react';
import { 
  Building2, MapPin, BedDouble, Maximize2, ShieldCheck, ArrowRightLeft, CalendarCheck, FileText, Heart, Calculator, Camera, Eye
} from 'lucide-react';

export default function PropertyCard({
  property,
  activePersona,
  onBookVisit,
  onToggleCompare,
  isCompared,
  onInspectCitations,
  isFavorite,
  onToggleFavorite,
  onOpenEmiCalculator,
  scoutReason,
  isSpotlighted,
  onSelectSpotlight
}) {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isSale = property.listing_type === 'sale';
  const priceDisplay = isSale
    ? `₹${(property.sale_price_inr / 10000000).toFixed(2)} Cr`
    : `₹${property.rent_inr?.toLocaleString('en-IN')}/mo`;

  // Estimate monthly EMI for sale properties (8.5% interest, 20 yr tenure)
  let estimatedEmi = 0;
  if (isSale && property.sale_price_inr) {
    const loanAmt = property.sale_price_inr * 0.8;
    const r = 8.5 / 12 / 100;
    const n = 240;
    estimatedEmi = Math.round((loanAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  const hasPhotos = property.has_real_photos || (property.images && property.images.length > 0 && !imgError);
  const photoCount = property.images ? property.images.length : 4;

  return (
    <div 
      onClick={onSelectSpotlight}
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        overflow: 'hidden',
        border: isSpotlighted ? '2px solid var(--accent-blue-100)' : '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        boxShadow: isSpotlighted ? 'var(--shadow-glow)' : 'var(--shadow-glass)',
        transition: 'all 0.25s ease',
        position: 'relative',
        cursor: 'pointer'
      }}
    >
      {/* Property Image Banner or Classy Architectural Banner */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '210px',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #171b26 0%, #1c2232 100%)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        {hasPhotos ? (
          <img
            src={property.images[0]}
            alt={property.society_name}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              color: 'transparent',
              fontSize: '0px'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '20px',
            textAlign: 'center',
            background: 'radial-gradient(circle at center, rgba(142, 178, 235, 0.08) 0%, rgba(23, 27, 38, 0.95) 100%)'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              background: 'rgba(142, 178, 235, 0.12)',
              border: '1px solid rgba(142, 178, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={26} color="var(--accent-blue-100)" />
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                Verified Listing Details
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                📷 No Photos Uploaded by Owner
              </span>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          gap: '6px'
        }}>
          <span className={`badge ${isSale ? 'badge-amber' : 'badge-emerald'}`} style={{ backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            {isSale ? 'FOR SALE' : 'FOR RENT'}
          </span>
          <span className="badge badge-sky" style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', border: 'none' }}>
            {property.bedrooms} BHK
          </span>
        </div>

        {/* AI-Generated / Real Photo Indicator Badge */}
        {hasPhotos && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: property.has_real_photos ? 'rgba(16, 185, 129, 0.9)' : 'rgba(234, 88, 12, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.675rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            zIndex: 2
          }}>
            {property.has_real_photos ? '📷 Real Photo' : '✨ AI-Generated Image'}
          </div>
        )}

        {/* Photo Gallery Trigger Button */}
        <button
          onClick={() => setPhotoModalOpen(true)}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <Camera size={14} /> View Photos ({photoCount})
        </button>
      </div>

      {/* Header Row: Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
            {property.society_name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            <MapPin size={14} color="var(--accent-sapphire)" />
            <span>{property.locality}, Bengaluru</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Favorite Heart Toggle Button */}
          <button
            onClick={() => onToggleFavorite && onToggleFavorite(property.listing_id)}
            style={{
              background: isFavorite ? 'rgba(225, 29, 72, 0.12)' : 'var(--bg-canvas)',
              border: isFavorite ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isFavorite ? 'var(--accent-rose)' : 'var(--text-secondary)'
            }}
            title={isFavorite ? 'Remove from Saved Favorites' : 'Add to Saved Favorites'}
          >
            <Heart size={16} fill={isFavorite ? 'var(--accent-rose)' : 'none'} color={isFavorite ? 'var(--accent-rose)' : 'var(--text-secondary)'} />
          </button>

          {/* Compare Button */}
          <button
            onClick={() => onToggleCompare(property)}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              background: isCompared ? 'var(--accent-primary)' : 'transparent',
              color: isCompared ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <ArrowRightLeft size={13} /> {isCompared ? 'Compared' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Pricing & Key Specs Grid (Auto-fitting responsive grid prevents column text overlap) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        background: 'var(--bg-canvas)',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
            {isSale ? 'ASKING SALE PRICE' : 'MONTHLY RENT'}
          </span>
          <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px', whiteSpace: 'nowrap' }}>
            {priceDisplay}
          </p>
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
            {isSale ? 'EST. BANK EMI' : 'SECURITY DEPOSIT'}
          </span>
          <p className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
            {isSale ? (
              <span onClick={() => onOpenEmiCalculator && onOpenEmiCalculator(property.sale_price_inr)} style={{ cursor: 'pointer', color: 'var(--accent-sapphire)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                ₹{estimatedEmi.toLocaleString('en-IN')}/mo <Calculator size={13} />
              </span>
            ) : (
              `₹${((property.deposit_inr || property.rent_inr * 6) / 100000).toFixed(2)} Lakhs`
            )}
          </p>
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>FLOOR SPACE</span>
          <p className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
            {property.sqft} sq.ft.
          </p>
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>RERA STANDING</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 700 }}>
            <ShieldCheck size={14} /> Verified
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {property.description}
      </p>

      {scoutReason && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.06)',
          borderLeft: '4px solid var(--accent-primary)',
          padding: '12px 16px',
          borderRadius: '0 12px 12px 0',
          fontSize: '0.825rem',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}>
          <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ✨ Why Scout Picked This Property
          </span>
          <span style={{ fontWeight: 500, lineHeight: 1.4 }}>{scoutReason}</span>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '4px' }}>
        <button
          onClick={() => onBookVisit(property)}
          className="btn-primary"
          style={{ flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: '0.85rem' }}
        >
          <CalendarCheck size={16} /> Schedule Site Visit
        </button>

        <button
          onClick={() => onInspectCitations('SRC_GBA')}
          className="btn-secondary"
          style={{ padding: '10px 14px', fontSize: '0.85rem' }}
        >
          <FileText size={15} /> Citations
        </button>
      </div>

      {/* Full Resolution Photo Modal */}
      {photoModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '800px',
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <button
              onClick={() => setPhotoModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '99px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ✕
            </button>

            <img
              src={primaryImage}
              alt={property.society_name}
              style={{ width: '100%', height: '420px', objectFit: 'cover' }}
            />

            <div style={{ padding: '20px' }}>
              <div style={{
                background: property.has_real_photos ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                border: `1px solid ${property.has_real_photos ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 88, 12, 0.3)'}`,
                color: property.has_real_photos ? '#34d399' : '#fb923c',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '0.775rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>
                  {property.has_real_photos 
                    ? '📷 Verified Real Property Photographs provided by owner.' 
                    : '✨ AI-Generated Rendering Note: These images are AI-generated architectural representations of the property.'}
                </span>
              </div>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {property.society_name} — Property Gallery
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {property.locality}, Bengaluru • {property.bedrooms} BHK • {property.sqft} sq.ft.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
