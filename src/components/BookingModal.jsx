import React, { useState, useEffect } from 'react';
import { X, CalendarCheck, CheckCircle2, FileText, Send, Phone, Mail, Sparkles, UserCheck, Calendar, AlertCircle, Clock, Check, Ban } from 'lucide-react';
import {
  SITE_VISIT_TIME_SLOTS,
  fetchBrokerSlotAvailability,
  submitSiteVisitRequest,
  checkBookingApiHealth
} from '../utils/siteVisitBooking';

export default function BookingModal({ isOpen, onClose, property, onBookingComplete }) {
  if (!isOpen || !property) return null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [visitDate, setVisitDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 11:00 AM');
  const [slotStatusMap, setSlotStatusMap] = useState({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityUnknown, setAvailabilityUnknown] = useState(false);

  const availableSlots = SITE_VISIT_TIME_SLOTS;

  // Fetch slot availability whenever visitDate changes
  useEffect(() => {
    if (!visitDate) return;
    fetchSlotAvailability(visitDate);
  }, [visitDate]);

  const fetchSlotAvailability = async (targetDate) => {
    setIsLoadingSlots(true);
    setBookingError(null);
    setAvailabilityUnknown(false);
    const statusMap = await fetchBrokerSlotAvailability(targetDate);
    setSlotStatusMap(statusMap);

    const apiErrors = Object.values(statusMap).filter((slot) => slot?.error);
    if (apiErrors.length === SITE_VISIT_TIME_SLOTS.length) {
      setAvailabilityUnknown(true);
      const healthy = await checkBookingApiHealth();
      setBookingError(
        healthy
          ? 'Broker availability could not be loaded. You can still submit — we will verify your slot on confirmation.'
          : 'Booking server is offline. In a separate terminal run: npm run dev:api — then click Retry below.'
      );
    }

    const firstFree = availableSlots.find((s) => statusMap[s]?.is_available);
    if (firstFree) {
      setSelectedSlot(firstFree);
    } else if (availableSlots.length > 0) {
      setSelectedSlot(availableSlots[0]);
    }
    setIsLoadingSlots(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !visitDate || !selectedSlot || !email || !email.includes('@')) {
      setBookingError('Please enter your name, phone, visit date, time slot, and a valid email address.');
      return;
    }

    // Check if slot is available (skip when availability API was unreachable)
    const slotInfo = slotStatusMap[selectedSlot];
    if (!availabilityUnknown && slotInfo && !slotInfo.is_available) {
      setBookingError(`The slot ${selectedSlot} is fully booked by all 8 brokers. Please select a green available slot.`);
      return;
    }

    setBookingError(null);
    setIsSubmitting(true);

    try {
      const data = await submitSiteVisitRequest(property, {
        name,
        email,
        phone,
        visitDate,
        timeSlot: selectedSlot
      });

      if (!data.success) {
        const isBrokerBusy = data.error === 'ALL_BROKERS_BUSY';
        setBookingError(
          isBrokerBusy
            ? (data.message || 'All 8 property brokers are busy for this slot. Please choose another time or date.')
            : (data.message || 'Booking could not be completed. Please try again.')
        );
        setIsSubmitting(false);
        return;
      }

      setBookingResult(data);
      setIsSubmitted(true);
      if (typeof onBookingComplete === 'function') {
        onBookingComplete(data);
      }
    } catch (err) {
      console.warn('Site visit booking failed:', err);
      const msg = err.message || '';
      const isNetwork = /failed|fetch|network|connection|502|503|504|abort/i.test(msg);
      setBookingError(
        isNetwork
          ? 'Could not reach the booking server. Run npm run dev:api in a separate terminal, then retry.'
          : (msg || 'Could not complete booking. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '580px',
        width: '100%',
        padding: '32px',
        borderRadius: '24px',
        background: 'var(--modal-bg)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
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

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarCheck size={26} color="#ffffff" />
              </div>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Schedule Physical Site Visit
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {property.society_name} • {property.locality}
                </p>
              </div>
            </div>

            {bookingError && (
              <div style={{
                background: availabilityUnknown ? '#fffbeb' : '#fef2f2',
                border: availabilityUnknown ? '1px solid #fcd34d' : '1px solid #fca5a5',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: availabilityUnknown ? '#92400e' : '#991b1b',
                fontSize: '0.8rem'
              }}>
                <AlertCircle size={20} style={{ shrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong>{availabilityUnknown ? 'Availability Unverified:' : 'Booking Error:'}</strong>
                  <p style={{ margin: '2px 0 0 0' }}>{bookingError}</p>
                  {availabilityUnknown && (
                    <button
                      type="button"
                      onClick={() => fetchSlotAvailability(visitDate)}
                      disabled={isLoadingSlots}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #fcd34d',
                        background: '#ffffff',
                        color: '#92400e',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isLoadingSlots ? 'Retrying…' : 'Retry connection'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Arsh Maheshwari"
                    style={{
                      width: '100%',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Phone Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    style={{
                      width: '100%',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Preferred Visit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Email Address (for Google Calendar & Itinerary)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arsh@example.com"
                    style={{
                      width: '100%',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Visual Slots Grid (Green = Available, Red = Busy) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--accent-primary)" /> Select Time Slot (Green = Free, Red = Busy)
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    8 Brokers Total
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {availableSlots.map(slot => {
                    const status = slotStatusMap[slot] || { is_available: true, available_count: 8 };
                    const isAvailable = status.is_available;
                    const isSelected = selectedSlot === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => isAvailable && setSelectedSlot(slot)}
                        disabled={!isAvailable}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease',
                          border: isSelected 
                            ? '2px solid var(--accent-emerald, #10b981)' 
                            : isAvailable 
                              ? '1.5px solid rgba(16, 185, 129, 0.4)' 
                              : '1.5px solid rgba(239, 68, 68, 0.4)',
                          background: isSelected 
                            ? 'rgba(16, 185, 129, 0.2)' 
                            : isAvailable 
                              ? 'rgba(16, 185, 129, 0.08)' 
                              : 'rgba(239, 68, 68, 0.08)',
                          opacity: isAvailable ? 1 : 0.75
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isAvailable ? 'var(--text-primary)' : 'var(--accent-crimson)' }}>
                            {slot}
                          </span>
                          {isAvailable ? (
                            <Check size={14} color="var(--accent-emerald, #10b981)" />
                          ) : (
                            <Ban size={14} color="var(--accent-crimson, #ef4444)" />
                          )}
                        </div>

                        <div style={{ marginTop: '4px', fontSize: '0.7rem', fontWeight: 600, color: isAvailable ? 'var(--accent-emerald, #10b981)' : 'var(--accent-crimson)' }}>
                          {isAvailable 
                            ? `🟢 ${status.available_count} Broker(s) Free` 
                            : `🔴 Fully Booked (0 Free)`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!availabilityUnknown && slotStatusMap[selectedSlot] && !slotStatusMap[selectedSlot].is_available)}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '12px', marginTop: '6px' }}
            >
              {isSubmitting ? 'Checking Broker Schedule...' : `Confirm Visit @ ${selectedSlot} ➔`}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Site Visit Request Confirmed!
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Visit for <strong>{property.society_name}</strong> scheduled for <strong>{visitDate}</strong> at <strong>{selectedSlot}</strong>.
              </p>
            </div>

            {/* Assigned Broker Details Box */}
            {bookingResult?.broker && (
              <div style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '16px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <UserCheck size={18} /> Assigned Dedicated Broker:
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '26px' }}>
                  <p style={{ margin: '2px 0' }}><strong>{bookingResult.broker.name}</strong> (Rating: ★ {bookingResult.broker.rating})</p>
                  <p style={{ margin: '2px 0' }}>📞 WhatsApp: {bookingResult.broker.phone}</p>
                  <p style={{ margin: '2px 0' }}>✉️ Email: {bookingResult.broker.email}</p>
                </div>
              </div>
            )}

            {/* Google Calendar Sync Button */}
            {bookingResult?.google_calendar?.calendar_html_link && (
              <a
                href={bookingResult.google_calendar.calendar_html_link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#4285F4',
                  color: '#ffffff',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)'
                }}
              >
                <Calendar size={18} /> Add to Google Calendar (MCP Synced)
              </a>
            )}

            {/* Email Status Banner */}
            {(() => {
              const emailStatus = bookingResult?.email_dispatch;
              const delivered = emailStatus?.delivered === true;
              return (
            <div style={{
              background: delivered
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(2, 132, 199, 0.08))'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.08))',
              border: delivered ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '14px',
              padding: '14px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: delivered ? 'var(--accent-primary)' : '#b45309', fontSize: '0.85rem', fontWeight: 700 }}>
                <Mail size={16} /> {delivered ? 'Confirmation Email Sent!' : 'Booking Saved — Email Pending'}
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                {delivered
                  ? <>Confirmation sent to <strong>{email}</strong> with broker details and calendar link.</>
                  : <>Your visit is booked, but the confirmation email could not be sent. Please save broker contact details below.</>}
              </p>
            </div>
              );
            })()}

            <button onClick={onClose} className="btn-primary" style={{ justifyContent: 'center' }}>
              Done & Return to Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
