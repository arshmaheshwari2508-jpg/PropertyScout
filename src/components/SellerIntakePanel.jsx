import React, { useState } from 'react';
import { 
  UserCheck, Plus, CheckCircle2, Sparkles, TrendingUp, DollarSign, 
  Users, Award, Lightbulb, Tag, ChevronRight, AlertCircle, Eye, MessageSquare, Image, UploadCloud, Camera
} from 'lucide-react';

export default function SellerIntakePanel({ onSubmitIntake, sellerListings = [] }) {
  const [activeTab, setActiveTab] = useState('photos'); // 'photos', 'intake', 'analytics', 'tips'
  
  // Form State
  const [title, setTitle] = useState('');
  const [locality, setLocality] = useState('Koramangala');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [sqft, setSqft] = useState('');
  const [furnishing, setFurnishing] = useState('Fully Furnished');
  const [sellerNotes, setSellerNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Discount Calculator State
  const [askingPrice, setAskingPrice] = useState(38000);
  const [discountPercent, setDiscountPercent] = useState(5);

  const discountedPrice = Math.round(askingPrice * (1 - discountPercent / 100));
  const savingsAmount = askingPrice - discountedPrice;

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const photoUrls = files.map(file => URL.createObjectURL(file));
      setPhotos(prev => [...prev, ...photoUrls]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !price || !sqft) return;

    onSubmitIntake({
      property_title: title,
      locality,
      price_inr: parseFloat(price.replace(/,/g, '')),
      bedrooms: parseInt(bedrooms),
      sqft: parseInt(sqft),
      furnishing,
      seller_review_notes: sellerNotes || 'Spacious apartment in prime locality.',
      photos_count: photos.length
    });

    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 4000);
    setTitle('');
    setPrice('');
    setSqft('');
    setSellerNotes('');
    setPhotos([]);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Sub-Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={22} color="var(--accent-rose)" />
          <div>
            <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Seller & Landlord Hub
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Photo Upload • Property Intake • Market Demand Index • Pricing Strategy
            </p>
          </div>
        </div>

        {/* Prominent Top Navigation Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-canvas)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('photos')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'photos' ? 'var(--accent-rose)' : 'transparent',
              color: activeTab === 'photos' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.775rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Camera size={14} /> 📸 Upload Flat Photos
          </button>
          <button
            onClick={() => setActiveTab('intake')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'intake' ? 'var(--accent-rose)' : 'transparent',
              color: activeTab === 'intake' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.775rem',
              cursor: 'pointer'
            }}
          >
            + List Property Form
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'analytics' ? 'var(--accent-rose)' : 'transparent',
              color: activeTab === 'analytics' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.775rem',
              cursor: 'pointer'
            }}
          >
            📈 Demand Index
          </button>
        </div>
      </div>

      {/* TAB 1: DEDICATED PROMINENT PHOTO UPLOAD BOX AT THE TOP */}
      {activeTab === 'photos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(2, 132, 199, 0.08))',
            border: '2px dashed var(--accent-primary)',
            borderRadius: '16px',
            padding: '28px',
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <UploadCloud size={40} color="var(--accent-primary)" style={{ margin: '0 auto 8px' }} />
            <h4 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              📸 Click or Drag & Drop Property Photos Here
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Upload living room, balcony, kitchen, and bedroom photos. Properties with photos get <strong>280% more buyer inquiries</strong>!
            </p>
            <span className="badge badge-emerald" style={{ marginTop: '12px' }}>High Visibility Boost</span>
          </div>

          {/* Uploaded Photo Previews */}
          {photos.length > 0 ? (
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Uploaded Photos ({photos.length} Attached):
              </span>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                {photos.map((src, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={src}
                      alt={`Flat photo ${idx + 1}`}
                      style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                    />
                    <span style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px' }}>
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', italic: 'true', textAlign: 'center' }}>
              No photos attached yet. Click above to select image files from your computer.
            </p>
          )}

          <button onClick={() => setActiveTab('intake')} className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px' }}>
            Continue to Listing Details ➔
          </button>
        </div>
      )}

      {/* TAB 2: FULL PROPERTY INTAKE FORM */}
      {activeTab === 'intake' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isSubmitted && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#10b981',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} />
              <span><strong>Success!</strong> Property and {photos.length} photo(s) published to website!</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Property / Society Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Prestige Acropolis"
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Locality / Sub-Area *
              </label>
              <select
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="Koramangala">Koramangala</option>
                <option value="Indiranagar">Indiranagar</option>
                <option value="HSR Layout">HSR Layout</option>
                <option value="Whitefield">Whitefield</option>
                <option value="Mahadevapura">Mahadevapura</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Asking Price (₹ or Crores) *
              </label>
              <input
                type="text"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 80,00,000 or 4 Crores"
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Bedrooms (BHK)
              </label>
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Floor Space (sqft) *
              </label>
              <input
                type="number"
                required
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="e.g. 1250"
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Furnishing
              </label>
              <select
                value={furnishing}
                onChange={(e) => setFurnishing(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="Fully Furnished">Fully Furnished</option>
                <option value="Semi-Furnished">Semi-Furnished</option>
                <option value="Unfurnished">Unfurnished</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Seller Review & Special Features Text Box *
            </label>
            <textarea
              rows={3}
              value={sellerNotes}
              onChange={(e) => setSellerNotes(e.target.value)}
              placeholder="Enter special features, newly installed modular kitchen, balcony orientation, power backup..."
              style={{
                width: '100%',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                resize: 'vertical'
              }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px', background: 'linear-gradient(135deg, var(--accent-rose), #be123c)' }}>
            <Plus size={16} /> Publish Property Listing ({photos.length} Photos Attached)
          </button>
        </form>
      )}

      {/* TAB 3: MARKET DEMAND INDEX & DISCOUNT CALCULATOR */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <Users size={14} color="var(--accent-primary)" /> ACTIVE BUYERS / TENANTS
              </div>
              <p className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>48 Searches</p>
              <span className="badge badge-emerald" style={{ marginTop: '4px', fontSize: '0.65rem' }}>High Demand Area</span>
            </div>

            <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <TrendingUp size={14} color="var(--accent-gold)" /> AVG CLOSING TIME
              </div>
              <p className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>12 Days</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fastest in Bengaluru</span>
            </div>

            <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <Tag size={14} color="var(--accent-rose)" /> OPTIMAL RENT RANGE
              </div>
              <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)' }}>₹34k - ₹38k</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>For 2BHK in Koramangala</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
