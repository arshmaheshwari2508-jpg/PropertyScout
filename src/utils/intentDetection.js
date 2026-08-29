/**
 * Context-aware intent detection for the rental-only Property Scout platform.
 * Mirrors backend rules in src/grounding/query_router.py.
 */

import { extractSoftPreferences, hasNoPreference } from './softPreferences.js';

export const PURCHASE_DECLINE_MSG =
  "We can't help you with home purchase queries. Our platform specializes exclusively in verified rental property discovery in Bengaluru. If you'd like to rent instead, tell me your preferred neighborhood and budget.";

const PURCHASE_PATTERN =
  /\b(buy|buying|purchase|for sale|sale price|home purchase|own a (?:home|house|flat|property|apartment|villa))\b/i;

const RENTAL_PATTERN =
  /\b(rent|rental|renting|lease|leasing|for rent|to rent|looking to rent|want to rent|need to rent|rent out)\b/i;

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
    return "I'd be happy to help you find a rental apartment in Bengaluru! Which neighborhood or locality do you prefer? For example Koramangala, Indiranagar, or Whitefield.";
  }
  if (loc && !merged.maxBudget && !merged.bedrooms) {
    return `Got it, ${loc}! What is your target monthly rent, and how many bedrooms are you looking for?`;
  }
  if (!loc && (merged.maxBudget || merged.bedrooms)) {
    return 'Which neighborhood or locality in Bengaluru would you like to rent in?';
  }
  if (loc && merged.maxBudget && !merged.bedrooms) {
    return `Understood! How many bedrooms or BHK are you looking for in ${loc}?`;
  }
  if (loc && merged.bedrooms && !merged.maxBudget) {
    return `Got it, ${loc}! What is your target monthly rent?`;
  }
  return null;
}

export function getRequirementsPrompt(locality = 'your chosen area') {
  return `Before I shortlist rentals in ${locality}, do you have any specific requirements? For example hospital nearby, metro access, schools, parks, fully furnished, or pet-friendly. You can also say "no preference".`;
}

export function hasPreferenceInput(userQuery) {
  if (!userQuery) return false;
  return extractSoftPreferences(userQuery).length > 0 || hasNoPreference(userQuery);
}
