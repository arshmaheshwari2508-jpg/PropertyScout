import React from 'react';
import { X, Sparkles, Building2, ShieldCheck, MapPin, Compass, HelpCircle, Award, History, Globe2, Mail, Phone, Clock } from 'lucide-react';

export default function InfoModals({ activeModal, onClose }) {
  if (!activeModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px',
        background: 'var(--bg-surface)',
        border: '1px solid rgba(217, 119, 6, 0.25)',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} color="var(--text-secondary)" />
        </button>

        {/* MODAL 1: ABOUT US */}
        {activeModal === 'about' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <History size={26} color="#ffffff" />
              </div>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  About SCOUT.AI Real Estate
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Our Journey • From Delhi in 1999 to Voice-First Innovation
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-canvas)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)', lineHeight: 1.7, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '12px' }}>
                Founded in <strong>1999 in Delhi</strong>, SCOUT.AI began as a trusted brick-and-mortar real estate consultancy helping families find their first homes across North India.
              </p>
              <p style={{ marginBottom: '12px' }}>
                Over the past 25+ years, we built a reputation for complete pricing transparency, verified property listings, and buyer advocacy.
              </p>
              <p style={{ marginBottom: '12px' }}>
                Now, we are expanding our presence into <strong>Bengaluru's tech hubs</strong>, combining our quarter-century of deep real estate expertise with state-of-the-art Voice AI technology.
              </p>
              <p style={{ marginBottom: '12px' }}>
                Our voice-first platform allows buyers, sellers, and landlords to converse naturally in plain English or Hindi to discover properties, calculate yields, and evaluate neighborhood transit telemetry instantly.
              </p>
              <p>
                From Delhi's historic neighborhoods to Bengaluru's modern high-rises, our mission remains unchanged: empowering every client with verified property intelligence.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>1999</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Founded in Delhi</p>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)' }}>25+ Yrs</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Industry Heritage</p>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-rose)' }}>Bengaluru</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tech Expansion</p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: HOW IT WORKS */}
        {activeModal === 'how' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-rose))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={26} color="#ffffff" />
              </div>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  How SCOUT.AI Works
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Voice-First Discovery • Verified Listings • GIS Telemetry
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>1. Select Your Role & Tap the Mic</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Choose whether you are looking to Buy/Rent or Sell/List a property. Speak naturally to the AI Voice Agent to state your requirements.
                </p>
              </div>

              <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>2. Real-Time Transit & Safety Telemetry</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  OpenStreetMap GIS telemetry measures exact walking distances to Namma Metro stations, tech parks, hospitals, and schools.
                </p>
              </div>

              <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>3. Instant Site Visit Booking</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Schedule physical site visits with automated PDF itinerary dispatch directly to your email or WhatsApp.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: FAQS & HELP & SUPPORT */}
        {activeModal === 'faq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={26} color="#ffffff" />
              </div>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Help & Support Center
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Frequently Asked Questions & Official Contact Channels
                </p>
              </div>
            </div>

            {/* Official Support Contact Channels Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(2, 132, 199, 0.08))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={18} color="var(--accent-primary)" /> Contact Support Team
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Have questions regarding property listings, site visits, or valuation queries? Reach out to our dedicated support desk:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>SUPPORT EMAIL ID</span>
                  <a href="mailto:support@scout.ai" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                    support@scout.ai
                  </a>
                </div>

                <div style={{ background: 'var(--bg-canvas)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>HELPLINE (DELHI & BLR)</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    +91 (080) 4950-8800
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Q: How do I list my property?</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Click "I Want to Sell or List My Property" on the home page, or tap the microphone in Seller Mode and state your flat details!
                </p>
              </div>

              <div style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Q: Are the prices accurate?</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Yes! Prices are queried directly from verified active database listings across Koramangala, Indiranagar, HSR Layout, and Whitefield.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
