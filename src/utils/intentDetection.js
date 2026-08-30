/**
 * Context-aware intent detection for the rental-only Property Scout platform.
 * Mirrors backend rules in src/grounding/query_router.py.
 */

import { extractSoftPreferences, hasNoPreference } from './softPreferences.js';

export const PURCHASE_DECLINE_MSG =
  'Rentals only in Bengaluru — not purchases. Share area and budget to rent.';

export const OUT_OF_SCOPE_DECLINE_MSG =
  'I only help with Bengaluru rentals — not general questions.';

export const OUT_OF_SCOPE_CONTINUE_PROMPT =
  'Want to continue? Say yes or no.';

export function getOutOfScopeResponse() {
  return `${OUT_OF_SCOPE_DECLINE_MSG} ${OUT_OF_SCOPE_CONTINUE_PROMPT}`;
}

export function isAffirmativeResponse(query) {
  const q = (query || '').toLowerCase().trim();
  return /^(yes|yeah|yep|yup|sure|ok|okay|continue|go ahead|please|y)\b/.test(q) || q === 'yes please';
}

export function isNegativeResponse(query) {
  const q = (query || '').toLowerCase().trim();
  return /^(no|nope|nah|stop|cancel|exit|quit|n)\b/.test(q) || q.includes('no thanks') || q.includes('not now');
}

export function getScopeContinueResumePrompt(buyerData = {}) {
  return getMissingRentalPrompt(buyerData) || 'Which Bengaluru area, budget, and BHK are you looking for?';
}

const PURCHASE_PATTERN =
  /\b(buy|buying|purchase|for sale|sale price|home purchase|own a (?:home|house|flat|property|apartment|villa))\b/i;

const RENTAL_PATTERN =
  /\b(rent|rental|renting|lease|leasing|for rent|to rent|looking to rent|want to rent|need to rent|rent out)\b/i;

/** General knowledge / non-real-estate — mirrors backend OFF_TOPIC_PATTERNS in query_router.py */
const OFF_TOPIC_PATTERN =
  /\b(recipe|cook|cooking|biryani|weather|forecast|capital of|president|prime minister|politics|election|cricket|football|ipl|movie|song|poem|joke|tell me a joke|write code|python|java|javascript|algorithm|stock market|bitcoin|crypto|flight|airline|airport|book me a trip|travel booking|homework|math problem|history of|who is the|who was the|what is the capital|translate this|chatgpt|gpt)\b/i;

const PROPERTY_SIGNAL_PATTERN =
  /\b(rent|rental|lease|bhk|bedroom|flat|apartment|property|properties|locality|localities|neighborhood|neighbourhood|metro|namma|site visit|furnished|broker|listing|koramangala|indiranagar|whitefield|bengaluru|bangalore|hsr|jayanagar|deposit|rera|commute|hospital|school|park|safe|safety|crime|schedule visit|book visit|penthouse|sqft|deposit)\b/i;

/**
 * True when the query is off-topic (general knowledge, trivia, etc.) and should NOT
 * advance the rental interview. Rental intent or search slots override this.
 */
export function isOutOfScopeQuery(query, { hasRentalContext = false } = {}) {
  if (!query || typeof query !== 'string') return false;
  if (hasRentalContext) return false;
  if (isPurchaseIntent(query)) return false;
  if (isRentalIntent(query)) return false;

  const q = query.trim();
  if (OFF_TOPIC_PATTERN.test(q)) return true;

  const isGeneralQuestion = /^(who|what|when|where|why|how|tell me about|define|explain|can you tell)\b/i.test(q);
  if (isGeneralQuestion && !PROPERTY_SIGNAL_PATTERN.test(q)) return true;

  return false;
}

/**
 * True when the user wants to buy / purchase property (out of scope).
 */
export function isPurchaseIntent(query) {
  if (!query || typeof query !== 'string') return false;
  const q = query.toLowerCase();
  if (/\b(buyer\s+mode|khareedna|buy\s+karna)\b/.test(q)) return true;
  return PURCHASE_PATTERN.test(query);
}

/**
 * True when the user explicitly expresses rental intent.
 * Purchase intent takes precedence when both appear in the same utterance.
 */
export function isRentalIntent(query) {
  if (!query || typeof query !== 'string') return false;
  if (isPurchaseIntent(query)) return false;
  return RENTAL_PATTERN.test(query);
}

/**
 * True when the utterance carries actionable rental search slots
 * (locality, budget, or BHK) — should override scripted interview steps.
 */
export function hasRentalSearchCriteria({ localities = [], budget = null, bhk = null, isPenthouse = false } = {}) {
  const hasLocality = Array.isArray(localities) && localities.length > 0;
  const hasBudget = budget !== null && budget !== undefined;
  const hasBhk = bhk !== null && bhk !== undefined && bhk !== '';
  return hasLocality || hasBudget || hasBhk || isPenthouse;
}

/**
 * Decide the next assistant prompt when rental intent is clear but criteria are incomplete.
 */
export function getMissingRentalPrompt(merged) {
  const loc = merged.locality || (merged.localities && merged.localities[0]);
  if (!loc && !merged.maxBudget && !merged.bedrooms) {
    return 'Which Bengaluru area do you want to rent in?';
  }
  if (loc && !merged.maxBudget && !merged.bedrooms) {
    return `Budget and BHK for ${loc}?`;
  }
  if (!loc && (merged.maxBudget || merged.bedrooms)) {
    return 'Which Bengaluru area?';
  }
  if (loc && merged.maxBudget && !merged.bedrooms) {
    return `How many BHK in ${loc}?`;
  }
  if (loc && merged.bedrooms && !merged.maxBudget) {
    return `Monthly rent budget for ${loc}?`;
  }
  return null;
}

export function getRequirementsPrompt(locality = 'your area') {
  return `Any must-haves in ${locality}? Hospital, metro, furnished — or say no preference.`;
}

export function hasPreferenceInput(userQuery) {
  if (!userQuery) return false;
  return extractSoftPreferences(userQuery).length > 0 || hasNoPreference(userQuery);
}
