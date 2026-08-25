import React, { useState } from 'react';
import { 
  Sparkles, Building2, UserCheck, ShieldCheck, MapPin, ArrowRight, TrendingUp, CheckCircle2, Navigation, Compass, Info, HelpCircle, Key, Mic, Eye, Camera, Star, Award, Zap, ChevronRight, Home, Heart, Layers, Mail, Phone, History, ChevronDown, Gem, Calendar
} from 'lucide-react';

export default function LandingHeroPage({ onSelectRole, onOpenModal, allProperties = [], onBookVisit }) {
  const [activeTab, setActiveTab] = useState('All');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const defaultPhotoPool = [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
  ];

  // Map all real 148 properties from bengaluru.rent database
  const showcaseProperties = (allProperties && allProperties.length > 0) ? allProperties.map((p, idx) => {
    const locStr = (p && p.locality) ? String(p.locality) : 'Bengaluru';
    const nameStr = (p && p.society_name) ? String(p.society_name) : `bengaluru.rent Property #${idx+1}`;
    const bhkNum = (p && p.bedrooms) ? Number(p.bedrooms) : 2;
    const rentVal = (p && p.rent_inr) ? Number(p.rent_inr) : 35000;
    const sqftVal = (p && p.sqft) ? Number(p.sqft) : 1200;
    const imgStr = (p && p.images && p.images[0]) ? p.images[0] : defaultPhotoPool[idx % defaultPhotoPool.length];
    const furnStr = (p && p.furnishing) ? p.furnishing : 'Semi-Furnished';

    return {
      id: (p && p.listing_id) || `rent-${idx}`,
      title: nameStr,
      category: bhkNum === 1 ? '1 BHK' : bhkNum === 2 ? '2 BHK' : bhkNum === 3 ? '3 BHK' : '4+ BHK',
      locality: locStr,
      price: `₹${rentVal.toLocaleString('en-IN')}/mo`,
      type: 'Rent',
      specs: `${bhkNum} BHK • ${sqftVal.toLocaleString()} sq.ft`,
      features: [furnStr, '24/7 Security', 'Power Backup'],
      image: imgStr,
      badge: 'FOR RENT',
      personaTarget: 'Renter',
      rawProperty: p
    };
  }) : [];

  const filteredProperties = (activeTab === 'All' 
    ? showcaseProperties 
    : showcaseProperties.filter(p => p.category === activeTab)).slice(0, 4);

  // FAQ Accordion List - Short & Punchy
  const faqs = [
    {
      question: "How does the Voice AI Assistant work?",
      answer: "Speak naturally in English or Hindi! Ask for rental homes like '2BHK in Indiranagar under ₹40,000' and SCOUT AI will fetch verified listings and telemetry in real time."
    },
    {
      question: "Are property prices and RERA details verified?",
      answer: "Yes! 100% of property rents, deposit terms, and RERA approvals come directly from our verified bengaluru.rent database."
    },
    {
      question: "How do I list my property as an Owner?",
      answer: "Open the Owner & Seller Hub to submit your rental property details via voice or a quick intake form."
    },
    {
      question: "How do I schedule a physical site visit?",
      answer: "Click 'Book Visit' on any property card or ask the voice assistant to schedule a tour with a verified broker."
    }
  ];

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '16px 20px 60px',
      display: 'flex',
      flexDirection: 'column',
      gap: '36px'
    }}>
      
      {/* ABOVE-THE-FOLD HERO BANNER & ROLE SELECTION GATEWAY */}
      <div style={{
        position: 'relative',
        borderRadius: '24px',
        background: 'var(--hero-bg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-glass)',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '20px'
      }}>
        
        {/* CENTERED PLATFORM NAME & BRAND HERO HEADER */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '850px',
          margin: '0 auto',
          gap: '10px'
        }}>
          {/* Top Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(142, 178, 235, 0.12)',
            border: '1px solid rgba(142, 178, 235, 0.3)',
            padding: '5px 16px',
            borderRadius: '9999px'
          }}>
            <Sparkles size={15} color="var(--accent-blue-100)" />
            <span style={{ fontSize: '0.775rem', fontWeight: 800, color: 'var(--accent-blue-100)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Voice-First AI Real Estate Scout • Bengaluru
            </span>
          </div>

          {/* SLEEK PLATFORM TITLE WITH REDUCED FONT SIZE */}
          <h1 className="font-display" style={{
            fontSize: '2.8rem',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '4px 0 2px 0'
          }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #ffffff 0%, #8EB2EB 50%, #80D6C7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 18px rgba(120, 161, 226, 0.35))'
            }}>
              SCOUT.AI
            </span>
          </h1>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            Find Your Dream Rental Home
          </h2>

          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            maxWidth: '620px',
            fontWeight: 500
          }}>
            Experience Bengaluru's premier Voice AI Property Assistant powered by real-time spatial telemetry & verified property listings.
          </p>

          {/* Voice Agent Mascot Feature Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '6px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '8px 14px'
            }}>
              <img
                src="/mascot.png"
                alt="SCOUT AI Agent Mascot"
                style={{
                  width: '72px',
                  height: '72px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 14px rgba(120, 161, 226, 0.35))'
                }}
              />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-blue-100)', display: 'block' }}>
                  🤖 SCOUT Voice Agent Active
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Speak naturally to find flats or apartments
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px'
            }}>
              {[
                "Rent 2BHK flat in Indiranagar under ₹45,000/mo",
                "Show luxury 3BHK in Whitefield near Metro",
                "Rent 2BHK in Koramangala with low deposit"
              ].map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectRole('Renter')}
                  className="chip"
                  style={{
                    fontSize: '0.775rem',
                    padding: '7px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={12} color="var(--accent-blue-100)" />
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SINGLE CLEAN RENTAL SCOUT LAUNCHER CARD */}
        <div style={{ width: '100%', maxWidth: '850px', marginTop: '6px' }}>
          <div
            onClick={() => onSelectRole('Renter')}
            className="glass-panel"
            style={{
              padding: '18px 26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              cursor: 'pointer',
              border: '1px solid var(--border-subtle)',
              borderRadius: '18px',
              background: 'var(--bg-surface)',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(142, 178, 235, 0.12)',
                border: '1px solid rgba(142, 178, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Key size={26} color="var(--accent-blue-100)" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Voice-First AI Rental Property Scout
                  </h3>
                  <span className="badge badge-blue" style={{ fontSize: '0.675rem' }}>Verified Scout</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Search verified 1BHK, 2BHK, 3BHK flats & apartments on rent across Bengaluru.
                </p>
              </div>
            </div>

            <button className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.875rem', flexShrink: 0 }}>
              Launch AI Agent <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. YOUR PERSONAL PROPERTY PARTNER — POWERED BY AI (SHOWCASE GRID) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--accent-blue-100)" />
              <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Verified Bengaluru Rental Residences
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Explore verified rental flats, gated apartments, and residences curated by our voice intelligence engine.
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            {[
              { id: 'All', label: '🌟 Featured Rentals' },
              { id: '1 BHK', label: '🏠 1 BHK' },
              { id: '2 BHK', label: '🏡 2 BHK' },
              { id: '3 BHK', label: '🏢 3 BHK' },
              { id: '4+ BHK', label: '🏙️ 4+ BHK' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--accent-blue-80)' : 'transparent',
                  color: activeTab === tab.id ? '#12151e' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '0.775rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* PROPERTY PHOTO CARDS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {filteredProperties.map((prop) => (
            <div
              key={prop.id}
              className="glass-panel"
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                transition: 'all 0.25s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue-100)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 35px rgba(120, 161, 226, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-glass)';
              }}
              onClick={() => onSelectRole(prop.personaTarget)}
            >
              {/* Photo Banner or Classy Architectural Banner */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '180px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #171b26 0%, #1c2232 100%)'
              }}>
                {prop.rawProperty && prop.rawProperty.has_real_photos ? (
                  <img
                    src={prop.image}
                    alt={prop.title}
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
                    gap: '6px',
                    padding: '16px',
                    textAlign: 'center',
                    background: 'radial-gradient(circle at center, rgba(142, 178, 235, 0.08) 0%, rgba(23, 27, 38, 0.95) 100%)'
                  }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: 'rgba(142, 178, 235, 0.12)',
                      border: '1px solid rgba(142, 178, 235, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building2 size={22} color="var(--accent-blue-100)" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                        Verified Listing Details
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        📷 No Photos Uploaded by Owner
                      </span>
                    </div>
                  </div>
                )}

                {/* Top Image Overlay Bar (Badge & Price) */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}>
                  <span className="badge badge-gold" style={{
                    fontSize: '0.675rem',
                    fontWeight: 800,
                    background: 'rgba(15, 21, 36, 0.90)',
                    color: 'var(--accent-gold)',
                    border: '1px solid var(--border-subtle)',
                    backdropFilter: 'blur(8px)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '55%'
                  }}>
                    {prop.badge}
                  </span>

                  <div style={{
                    background: 'rgba(15, 21, 36, 0.90)',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    whiteSpace: 'nowrap'
                  }}>
                    <span className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {prop.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs & Action */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-sapphire)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                    <MapPin size={13} color="var(--accent-sapphire)" /> {prop.locality}
                  </div>

                  <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '8px', wordBreak: 'break-word' }}>
                    {prop.title}
                  </h3>

                  <div style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--accent-sapphire)',
                    marginBottom: '8px'
                  }}>
                    {prop.specs}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {prop.features.map((feat, i) => (
                      <span key={i} style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-canvas)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '6px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBookVisit) {
                        onBookVisit(prop.rawProperty || {
                          society_name: prop.title,
                          locality: prop.locality,
                          rent_inr: parseInt(prop.price.replace(/[^\d]/g, '')) || 35000
                        });
                      }
                    }}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '8px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Book a physical site visit with verified broker"
                  >
                    <Calendar size={14} /> Book Physical Site Visit
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* 3. FREQUENTLY ASKED QUESTIONS (FAQ) & HERITAGE (COMPACT DESIGN) */}
      <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={18} color="var(--accent-blue-100)" />
              <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Frequently Asked Questions
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onOpenModal('about')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              <History size={13} color="var(--accent-blue-100)" /> About Us (1999)
            </button>
            <button onClick={() => onOpenModal('how')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              <Compass size={13} color="var(--accent-blue-100)" /> How It Works
            </button>
            <button onClick={() => onOpenModal('faq')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              <Mail size={13} color="var(--accent-blue-100)" /> Support & Contact
            </button>
          </div>
        </div>

        {/* Compact 2x2 FAQ Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue-100)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={12} color="var(--accent-blue-100)" /> {faq.question}
              </h4>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        {/* Compact Contact Footer Bar */}
        <div style={{
          background: 'rgba(142, 178, 235, 0.06)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '0.775rem'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            💬 Need help? Our Bengaluru & Delhi support team is available 7 days a week.
          </span>
          <div style={{ display: 'flex', gap: '16px', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent-blue-100)' }}>📧 support@scout.ai</span>
            <span style={{ color: 'var(--text-primary)' }}>📞 +91 (080) 4950-8800</span>
          </div>
        </div>

      </div>

    </div>
  );
}
