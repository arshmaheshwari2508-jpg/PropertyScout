import React from 'react';
import { Sparkles } from 'lucide-react';

const SIZE_MAP = {
  sm: 88,
  md: 140,
  lg: 180,
  hero: 220
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

/**
 * Property Scout AI assistant mascot with optional directional cue toward a CTA.
 */
export default function PropertyScoutMascot({
  size = 'md',
  pointTo = null,
  showBadge = true,
  badgeLabel = 'AI Assistant',
  listening = false,
  speaking = false
}) {
  const px = SIZE_MAP[size] || SIZE_MAP.md;

  // Face toward the Speak button (right side) — no horizontal mirror; slight tilt from left pivot
  const imgTransform = pointTo === 'right'
    ? 'rotate(8deg)'
    : pointTo === 'down'
      ? 'rotate(4deg)'
      : 'none';

  const transformOrigin = pointTo === 'right' ? 'left bottom' : 'center bottom';

  const ringColor = listening
    ? 'rgba(16, 185, 129, 0.55)'
    : speaking
      ? 'rgba(238, 210, 99, 0.55)'
      : 'rgba(142, 178, 235, 0.5)';

  return (
    <div
      className="scout-mascot-root"
      style={{
        position: 'relative',
        width: px,
        height: px,
        flexShrink: 0
      }}
      aria-hidden={pointTo ? true : undefined}
    >
      {(listening || speaking) && (
        <>
          <div
            className="scout-mascot-pulse"
            style={{ borderColor: ringColor }}
          />
          <div
            className="scout-mascot-pulse scout-mascot-pulse-delay"
            style={{ borderColor: ringColor }}
          />
        </>
      )}

      <img
        src="/mascot.png?v=2"
        alt={pointTo ? '' : 'Property Scout AI Assistant'}
        className="scout-mascot-img"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = FALLBACK_IMG;
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transform: imgTransform,
          transformOrigin,
          position: 'relative',
          zIndex: 2
        }}
      />

      {showBadge && (
        <div
          className="scout-mascot-badge"
          style={{
            position: 'absolute',
            bottom: size === 'hero' ? '8%' : '4%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'rgba(23, 27, 38, 0.92)',
            border: '1px solid rgba(142, 178, 235, 0.45)',
            fontSize: size === 'hero' ? '0.7rem' : '0.625rem',
            fontWeight: 800,
            color: 'var(--accent-blue-100)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
          }}
        >
          <Sparkles size={10} />
          {badgeLabel}
        </div>
      )}

      {pointTo === 'right' && (
        <div className="scout-point-cue scout-point-cue-right" aria-hidden="true">
          <span className="scout-point-arrow">›</span>
          <span className="scout-point-arrow scout-point-arrow-delay">›</span>
        </div>
      )}
    </div>
  );
}
