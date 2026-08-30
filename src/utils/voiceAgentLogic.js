/** Testable voice-agent helpers extracted from App.jsx */

import { hasNoPreference } from './softPreferences.js';

export function normalizeMatchText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/emarald/g, 'emerald')
    .replace(/emerlad/g, 'emerald')
    .replace(/containment area/g, 'cantonment area')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripBookingWords(text) {
  return normalizeMatchText(text)
    .replace(/\b(book|schedule|site visit|visit|for|the|a|please|want|this|that|property|flat|apartment)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generic tokens that must not alone match a society name (e.g. "nagar" → false RT Nagar pick). */
const GENERIC_SOCIETY_TOKENS = new Set([
  'nagar', 'layout', 'area', 'road', 'town', 'city', 'block', 'puram', 'pura',
  'phase', 'extension', 'cross', 'main', 'station', 'metro', 'greens', 'park',
  'view', 'villa', 'residency', 'apartment', 'complex', 'society', 'heights',
  'tower', 'enclave', 'estate', 'garden', 'court', 'palms', 'meadows', 'sanctuary',
  'elegance', 'splendour', 'splendor', 'gateway', 'corner', 'square', 'plaza',
]);

function isDistinctiveSocietyToken(token) {
  return token.length >= 3 && !GENERIC_SOCIETY_TOKENS.has(token);
}

function scoreDistinctiveNameTokens(queryText, strippedText, societyName) {
  const name = normalizeMatchText(societyName);
  const tokens = name.split(/[\s,&\-()]+/).filter(isDistinctiveSocietyToken);
  let score = 0;
  for (const token of tokens) {
    if (queryText.includes(token) || strippedText.includes(token)) score += token.length;
  }
  return score;
}

export function findShortlistPropertyFromQuery(query, list) {
  if (!query || !list?.length) return null;
  const q = normalizeMatchText(query);
  const stripped = stripBookingWords(query);
  const candidates = list.filter((p) => p?.society_name);

  for (const p of candidates) {
    const name = normalizeMatchText(p.society_name);
    if (q.includes(name) || (stripped && name.includes(stripped))) return p;
  }

  let best = null;
  let bestScore = 0;
  for (const p of candidates) {
    const score = scoreDistinctiveNameTokens(q, stripped, p.society_name);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 4 ? best : null;
}

/** True when the utterance confidently names a shortlist property (not a locality like "Indiranagar"). */
export function isConfidentPropertyNamePick(query, matchedProperty) {
  if (!query || !matchedProperty?.society_name) return false;
  const q = normalizeMatchText(query);
  const stripped = stripBookingWords(query);
  const name = normalizeMatchText(matchedProperty.society_name);
  if (q.includes(name) || (stripped.length >= 4 && name.includes(stripped))) return true;
  return scoreDistinctiveNameTokens(q, stripped, matchedProperty.society_name) >= 4;
}

export function userAlreadyPickedShortlistProperty(transcriptHistory = [], shortlist = []) {
  if (!shortlist?.length || !transcriptHistory?.length) return false;
  for (let i = transcriptHistory.length - 1; i >= 0; i--) {
    const turn = transcriptHistory[i];
    if (turn.role !== 'user') continue;
    if (isConfidentPropertyNamePick(turn.text, findShortlistPropertyFromQuery(turn.text, shortlist))) {
      return findShortlistPropertyFromQuery(turn.text, shortlist);
    }
  }
  return null;
}

export function isSiteVisitBookingIntent(query, matchedProperty) {
  const q = (query || '').toLowerCase();
  const showsInterest =
    q.includes('like') ||
    q.includes('love') ||
    q.includes('interested') ||
    q.includes('want this') ||
    q.includes('pick') ||
    q.includes('choose');
  return (
    q.includes('book site visit') ||
    q.includes('schedule visit') ||
    q.includes('book visit') ||
    q.includes('physical visit') ||
    q.includes('book appointment') ||
    (q.includes('book') && (q.includes('visit') || q.includes('slot') || q.includes('tour'))) ||
    ((q.includes('book') || q.includes('schedule')) && !!matchedProperty) ||
    (showsInterest && !!matchedProperty) ||
    isConfidentPropertyNamePick(query, matchedProperty)
  );
}

export function canTriggerSiteVisitBooking({ bookingIntent, matchedProperty, shortlistLength }) {
  if (!bookingIntent || shortlistLength <= 0) return false;
  return !!matchedProperty || bookingIntent;
}

/** STT noise / short affirmatives after results are shown — not a new search. */
export function isAmbiguousPostDiscoveryUtterance(query) {
  if (!query) return false;
  const q = query.toLowerCase().trim();
  if (hasNoPreference(query)) return true;
  return /^(come|yes|yeah|yep|ok|okay|sure|go ahead|fine|good|great|please|book it|that one|this one|the first one|first one|proceed|continue)$/i.test(q);
}

export function getPostDiscoveryBrowsePrompt(shortlist = []) {
  if (shortlist.length === 1) {
    const name = shortlist[0]?.society_name || 'the property on your screen';
    return `Great news — I've got a strong match for you: ${name}! Say the property name or "book a site visit" and I'll get your visit scheduled right away.`;
  }
  return "I've pulled together some promising options on your screen — take a look and tell me which one you'd love to visit. Just say the name or ask me to book a site visit!";
}

export function filterPropertiesByLocalities(properties, targetLocalities, matchesLocalityFn) {
  if (!targetLocalities?.length || targetLocalities.includes('All Bengaluru')) {
    return [...properties];
  }
  return properties.filter((item) =>
    targetLocalities.some((loc) => matchesLocalityFn(item, loc))
  );
}

/** Pessimistic broker slot status when availability API fails (BUG 049 guardrail). */
export function brokerSlotUnavailable() {
  return { is_available: false, available_count: 0, error: true };
}

/** Buyer step after a site visit is successfully booked (BUG 052). */
export const BUYER_STEP_BOOKING_COMPLETED = 6;

export const BOOKING_COMPLETED_THANK_YOU = 'Thank you for choosing PropertyScout — we can\'t wait to help you find your perfect home!';

export function isBookingCompletedStep(step) {
  return Number(step) === BUYER_STEP_BOOKING_COMPLETED;
}

/** After booking completes, never re-offer the visit resume / booking loop. */
export function shouldOfferSiteVisitResume({ hasSearched, buyerStep, bookingCompleted }) {
  if (bookingCompleted || isBookingCompletedStep(buyerStep)) return false;
  return Boolean(hasSearched && Number(buyerStep) >= 5);
}

export function buildBookingCompletedMessage(details = {}) {
  const parts = [];
  if (details.propertyName && details.visitDate && details.timeSlot) {
    parts.push(
      `You're all set! Your site visit for ${details.propertyName} is confirmed on ${details.visitDate} at ${details.timeSlot}.`
    );
  } else if (details.propertyName) {
    parts.push(`You're all set! Your site visit for ${details.propertyName} is confirmed.`);
  }
  if (details.email) parts.push(`I've sent a confirmation to ${details.email}.`);
  if (details.brokerName) parts.push(`${details.brokerName} will be there to welcome you at the property.`);
  parts.push(BOOKING_COMPLETED_THANK_YOU);
  return parts.join(' ');
}
