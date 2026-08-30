/**
 * Context-aware intent detection for the rental-only Property Scout platform.
 * Mirrors backend rules in src/grounding/query_router.py.
 */

import { extractSoftPreferences, hasNoPreference } from './softPreferences.js';

export const PURCHASE_DECLINE_MSG =
  "We can't help you with home purchase queries. Our platform specializes exclusively in verified rental property discovery in Bengaluru. If you'd like to rent instead, tell me your preferred neighborhood and budget.";

export const OUT_OF_SCOPE_DECLINE_MSG =
  "I'm Property Scout — I only help with rental property search in Bengaluru, like finding flats, comparing neighborhoods, checking metro access, and booking site visits. I can't answer general questions like that. Tell me which area you'd like to rent in, or your budget and BHK.";

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
