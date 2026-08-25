import React, { useState } from 'react';
import { X, Calculator, DollarSign, Calendar, Percent, ShieldCheck, Sparkles } from 'lucide-react';

export default function MortgageCalculatorModal({ isOpen, onClose, initialPrice = 12500000 }) {
  if (!isOpen) return null;

  const [propertyPrice, setPropertyPrice] = useState(initialPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(8.5);
  const [loanTenureYears, setLoanTenureYears] = useState(20);

  const downPaymentAmount = Math.round(propertyPrice * (downPaymentPercent / 100));
  const loanAmount = propertyPrice - downPaymentAmount;

  // Monthly interest rate calculation formula: EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
  const monthlyRate = interestRate / 12 / 100;
  const totalMonths = loanTenureYears * 12;

  let emi = 0;
  if (loanAmount > 0 && monthlyRate > 0 && totalMonths > 0) {
    emi = Math.round(
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
    );
  }

  const totalPayment = emi * totalMonths;
  const totalInterest = Math.max(0, totalPayment - loanAmount);

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
        maxWidth: '640px',
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

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Calculator size={26} color="#ffffff" />
          </div>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Home Loan EMI & Mortgage Calculator
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Estimate monthly payments, interest payable, and down payment schedules
            </p>
          </div>
        </div>

        {/* Controls Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Property Price Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Property Price:</label>
              <span className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ₹{(propertyPrice / 10000000).toFixed(2)} Crore (₹{propertyPrice.toLocaleString('en-IN')})
              </span>
            </div>
            <input
              type="range"
              min="2000000"
              max="50000000"
              step="500000"
              value={propertyPrice}
              onChange={(e) => setPropertyPrice(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {/* Down Payment & Interest Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Down Payment:</label>
                <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {downPaymentPercent}% (₹{(downPaymentAmount / 100000).toFixed(1)} Lakhs)
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={downPaymentPercent}
                onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Interest Rate:</label>
                <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                  {interestRate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min="6.5"
                max="12.5"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-gold)' }}
              />
            </div>
          </div>

          {/* Loan Tenure Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loan Tenure:</label>
              <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                {loanTenureYears} Years ({totalMonths} Months)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={loanTenureYears}
              onChange={(e) => setLoanTenureYears(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-secondary)' }}
            />
          </div>

          {/* Calculated Output Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(2, 132, 199, 0.08))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Estimated Monthly Home Loan EMI
              </span>
              <p className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px' }}>
                ₹{emi.toLocaleString('en-IN')}<span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Loan Principal: <strong>₹{(loanAmount / 100000).toFixed(2)} Lakhs</strong>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total Interest: <strong>₹{(totalInterest / 100000).toFixed(2)} Lakhs</strong>
              </span>
            </div>
          </div>

          <button onClick={onClose} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            Apply & Close Calculator
          </button>
        </div>
      </div>
    </div>
  );
}
