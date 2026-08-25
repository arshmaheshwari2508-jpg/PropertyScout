import React, { useState } from 'react';
import { 
  Building2, Users, Eye, MessageSquare, Tag, TrendingUp, CheckCircle2, AlertCircle, Plus, Calendar, DollarSign, Award, ChevronRight, Calculator
} from 'lucide-react';

export default function SellerListingsWorkspace({ sellerListings, onApplyDiscount, onOpenListForm }) {
  // Calculator State for Seller Potential
  const [calcLocality, setCalcLocality] = useState('Koramangala');
  const [calcBhk, setCalcBhk] = useState('2');

  const benchmarkData = {
    'Koramangala': { avgRent: 42000, cagr: '8.4%', occupancy: '96%', activeBuyers: 52 },
    'Indiranagar': { avgRent: 48000, cagr: '9.1%', occupancy: '98%', activeBuyers: 64 },
    'HSR Layout': { avgRent: 36000, cagr: '7.8%', occupancy: '94%', activeBuyers: 41 },
    'Whitefield': { avgRent: 38000, cagr: '8.2%', occupancy: '92%', activeBuyers: 38 },
    'Mahadevapura': { avgRent: 32000, cagr: '7.2%', occupancy: '90%', activeBuyers: 29 }
  };

  const selectedBench = benchmarkData[calcLocality] || benchmarkData['Koramangala'];
  const bhkMultiplier = parseInt(calcBhk) === 1 ? 0.65 : parseInt(calcBhk) === 3 ? 1.4 : 1.0;

  const estimatedMonthlyRent = Math.round(selectedBench.avgRent * bhkMultiplier);
  const estimatedAnnualIncome = estimatedMonthlyRent * 12;
  const estimated3YrEquityGain = Math.round(estimatedAnnualIncome * 2.8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.05), rgba(2, 132, 199, 0.05))', border: '1px solid var(--border-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="var(--accent-rose)" />
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Seller & Landlord Revenue Potential Center
              </h3>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              See what other landlords in Bengaluru are earning and discover your property's potential income on SCOUT.AI.
            </p>
          </div>

          <button onClick={onOpenListForm} className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-rose), #be123c)' }}>
            <Plus size={16} /> + List Property Now
          </button>
        </div>
      </div>

      {/* SECTION 1: WHAT OTHER SELLERS & LANDLORDS ARE EARNING */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} color="var(--accent-primary)" />
            <h4 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Average Seller & Landlord Earnings in Bengaluru
            </h4>
          </div>
          <span className="badge badge-emerald">Audited Rental Yields</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Koramangala Landlords</span>
            <p className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>₹42,000/mo</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>₹5.04 Lakhs/yr • 96% Occupancy</span>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Indiranagar Landlords</span>
            <p className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>₹48,000/mo</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>₹5.76 Lakhs/yr • 98% Occupancy</span>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HSR Layout Landlords</span>
            <p className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>₹36,000/mo</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>₹4.32 Lakhs/yr • 94% Occupancy</span>
          </div>

          <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Whitefield Landlords</span>
            <p className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>₹38,000/mo</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>₹4.56 Lakhs/yr • 92% Occupancy</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROPERTY POTENTIAL EARNINGS CALCULATOR */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calculator size={18} color="var(--accent-gold)" />
          <h4 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Calculate Your Property's Earning Potential
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Select Property Locality
            </label>
            <select
              value={calcLocality}
              onChange={(e) => setCalcLocality(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85rem' }}
            >
              <option value="Koramangala">Koramangala</option>
              <option value="Indiranagar">Indiranagar</option>
              <option value="HSR Layout">HSR Layout</option>
              <option value="Whitefield">Whitefield</option>
              <option value="Mahadevapura">Mahadevapura</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Select Configuration (BHK)
            </label>
            <select
              value={calcBhk}
              onChange={(e) => setCalcBhk(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 10px', fontSize: '0.85rem' }}
            >
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
            </select>
          </div>
        </div>

        {/* Calculated Output Box */}
        <div style={{
          background: 'var(--bg-canvas)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid var(--border-glow)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EST. MONTHLY RENT</span>
            <p className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              ₹{estimatedMonthlyRent.toLocaleString('en-IN')}/mo
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EST. ANNUAL INCOME</span>
            <p className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              ₹{(estimatedAnnualIncome / 100000).toFixed(2)} Lakhs/yr
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>3-YR ASSET VALUE GAIN</span>
            <p className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
              +₹{(estimated3YrEquityGain / 100000).toFixed(2)} Lakhs
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: YOUR LISTED PROPERTIES */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="var(--accent-rose)" />
            <h4 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Your Active Property Listings ({sellerListings.length})
            </h4>
          </div>
        </div>

        {sellerListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
            <p>You haven't listed any properties yet.</p>
            <button onClick={onOpenListForm} className="btn-primary" style={{ marginTop: '12px', background: 'linear-gradient(135deg, var(--accent-rose), #be123c)' }}>
              + List Property Now to Start Earning
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sellerListings.map((item) => (
              <div
                key={item.listing_id}
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h5 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.society_name}
                    </h5>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.locality}, Bengaluru • {item.bedrooms} BHK ({item.sqft} sqft)
                    </p>
                  </div>
                  <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    ₹{item.rent_inr ? item.rent_inr.toLocaleString('en-IN') : item.sale_price_inr?.toLocaleString('en-IN')}/mo
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} /> 142 Tenant Views</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={12} /> 8 Active Inquiries</span>
                    <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>[RAG Weight: 0.3]</span>
                  </div>

                  <button
                    onClick={() => onApplyDiscount(item)}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    <Tag size={12} /> Offer 5% Early Signing Discount
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
