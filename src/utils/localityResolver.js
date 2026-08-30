// Auto-generated canonical Bengaluru localities (76 zones)
import { resolveListingLocality } from './listingLocality.js';

export const CANONICAL_LOCALITIES = [
  "Anekal",
  "Anjanapura",
  "Arekere",
  "Attibele",
  "BTM Layout",
  "Banashankari",
  "Banaswadi",
  "Basavanagudi",
  "Basaveshwaranagar",
  "Begur",
  "Bellandur",
  "Bommanahalli",
  "Bommasandra",
  "C. V. Raman Nagar",
  "Cantonment Area",
  "Chandapura",
  "Chikkabanavara",
  "Domlur",
  "Electronic City",
  "Girinagar",
  "Gottigere",
  "HBR Layout",
  "HSR Layout",
  "Hebbal",
  "Hesaraghatta",
  "Hoodi",
  "Horamavu",
  "Hulimavu",
  "Indiranagar",
  "JP Nagar",
  "Jalahalli",
  "Jayanagar",
  "Jigani",
  "Kalyan Nagar",
  "Kamakshipalya",
  "Kammanahalli",
  "Kengeri",
  "Kengeri Satellite Town",
  "Koramangala",
  "Kothnur",
  "Krishnarajapuram",
  "Krishnarajapuram / KR Puram",
  "Kumaraswamy Layout",
  "Lingarajapuram",
  "Madiwala",
  "Mahadevapura",
  "Mahalakshmi Layout",
  "Malleswaram",
  "Marathahalli",
  "Mathikere",
  "Nagarbhavi",
  "Nandini Layout",
  "Nayandahalli",
  "Nelamangala",
  "Padmanabhanagar",
  "Peenya",
  "Pete Area",
  "R. T. Nagar",
  "Rajajinagar",
  "Rajarajeshwari Nagar",
  "Ramamurthy Nagar",
  "Sadashivanagar",
  "Sarjapura",
  "Seshadripuram",
  "Shivajinagar",
  "Thavarekere",
  "Ulsoor",
  "Ulsoor / Halasuru",
  "Uttarahalli",
  "Varthur",
  "Vasanth Nagar",
  "Vidyaranyapura",
  "Vijayanagar",
  "Whitefield",
  "Yelahanka",
  "Yeshwanthpur"
];

export const LOCALITY_ALIASES = {
  "cantonment area": "Cantonment Area",
  "cantonment": "Cantonment Area",
  "containment area": "Cantonment Area",
  "hsr": "HSR Layout",
  "hsr layout": "HSR Layout",
  "jp nagar": "JP Nagar",
  "j p nagar": "JP Nagar",
  "jpnagar": "JP Nagar",
  "rt nagar": "R. T. Nagar",
  "r t nagar": "R. T. Nagar",
  "ulsoor": "Ulsoor",
  "halasuru": "Ulsoor",
  "koramangala": "Koramangala",
  "kormangala": "Koramangala",
  "indiranagar": "Indiranagar",
  "indira nagar": "Indiranagar",
  "white field": "Whitefield",
  "whitefield": "Whitefield",
  "electronic city": "Electronic City",
  "ecity": "Electronic City",
  "marathahalli": "Marathahalli",
  "marathalli": "Marathahalli",
  "sarjapur": "Sarjapura",
  "sarjapur road": "Sarjapura",
  "domlur": "Domlur",
  "hebbal": "Hebbal",
  "bellandur": "Bellandur",
  "mahadevapura": "Mahadevapura",
  "jayanagar": "Jayanagar",
  "whitefield": "Whitefield",
  "btm": "BTM Layout",
  "btm layout": "BTM Layout",
  "banashankari": "Banashankari",
  "yelahanka": "Yelahanka",
  "hennur": "Hennur",
  "hennur garden": "Hennur",
  "kr puram": "Krishnarajapuram",
  "krishnarajapuram": "Krishnarajapuram",
  // Common ASR / phonetic misspellings
  "indira nager": "Indiranagar",
  "indranagar": "Indiranagar",
  "indirangar": "Indiranagar",
  "indira ngr": "Indiranagar",
  "jayanager": "Jayanagar",
  "jaya nagar": "Jayanagar",
  "koramangla": "Koramangala",
  "kora mangala": "Koramangala",
  "whitefiled": "Whitefield",
  "whitfield": "Whitefield",
  "hsr layot": "HSR Layout",
  "hsr lay out": "HSR Layout",
  "maratalli": "Marathahalli",
  "marathahali": "Marathahalli",
  "rajaji nagar": "Rajajinagar",
  "rajajinager": "Rajajinagar",
};

function compactLocalityKey(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function maxFuzzyDistance(length) {
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  return 3;
}

function buildLocalityLookup() {
  const entries = [];
  const seen = new Set();
  const add = (label, canonical) => {
    const compact = compactLocalityKey(label);
    if (!compact || compact.length < 3) return;
    const key = `${compact}::${canonical}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ compact, canonical: resolveListingLocality(canonical), label });
  };

  for (const loc of CANONICAL_LOCALITIES) {
    add(loc, loc);
    for (const part of loc.split('/')) add(part.trim(), loc);
  }
  for (const [alias, canonical] of Object.entries(LOCALITY_ALIASES)) {
    add(alias, canonical);
  }
  return entries;
}

const LOCALITY_LOOKUP = buildLocalityLookup();

function detectConfusableLocality(text) {
  const q = (text || '').toLowerCase().trim();
  if (!q || q.includes('indira')) return null;

  if (/^(rt|r\s*t)$/i.test(q) || /\b(rt|r\s*t)\s*nagar\b/.test(q)) {
    return {
      locality: 'R. T. Nagar',
      matchType: 'confusable',
      needsConfirmation: true,
      candidates: ['Indiranagar', 'R. T. Nagar'],
      confidence: 0.7,
      distance: 1,
    };
  }
  return null;
}

function extractExactLocalitiesFromText(text) {
  if (!text) return [];
  const q = text.toLowerCase();
  const matched = new Set();

  for (const [alias, canonical] of Object.entries(LOCALITY_ALIASES)) {
    if ((alias === 'rt nagar' || alias === 'r t nagar') && q.includes(alias) && !q.includes('indira')) {
      continue;
    }
    if (q.includes(alias)) matched.add(canonical);
  }

  const sorted = [...CANONICAL_LOCALITIES].sort((a, b) => b.length - a.length);
  const genericParts = new Set(['area', 'road', 'town', 'city', 'block', 'layout', 'nagar', 'puram', 'pura']);
  for (const loc of sorted) {
    const locLower = loc.toLowerCase();
    const parts = locLower.split('/').map((p) => p.trim());
    if (q.includes(locLower)) {
      matched.add(loc);
      continue;
    }
    for (const part of parts) {
      if (!part || part.length < 5 || genericParts.has(part)) continue;
      if (q.includes(part)) matched.add(loc);
    }
  }

  return [...matched].map((loc) => resolveListingLocality(loc));
}

function candidatePhrasesFromText(text) {
  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const phrases = new Set();
  if (!words.length) return [];
  phrases.add(words.join(' '));
  for (let size = 1; size <= Math.min(4, words.length); size++) {
    for (let i = 0; i <= words.length - size; i++) {
      phrases.add(words.slice(i, i + size).join(' '));
    }
  }
  return [...phrases];
}

/**
 * Fuzzy-resolve a spoken locality against all Bengaluru canonical names + aliases.
 * Returns { locality, matchType, needsConfirmation, candidates, confidence, distance }.
 */
export function fuzzyResolveLocality(text) {
  const empty = {
    locality: null,
    matchType: 'none',
    needsConfirmation: false,
    candidates: [],
    confidence: 0,
    distance: Infinity,
  };
  if (!text || !String(text).trim()) return empty;

  const confusable = detectConfusableLocality(text);
  if (confusable) return confusable;

  const exact = extractExactLocalitiesFromText(text);
  if (exact.length === 1) {
    return {
      locality: exact[0],
      matchType: 'exact',
      needsConfirmation: false,
      candidates: exact,
      confidence: 1,
      distance: 0,
    };
  }
  if (exact.length > 1) {
    const pivoted = extractLocalityFromText(text) || exact[0];
    return {
      locality: pivoted,
      matchType: 'exact',
      needsConfirmation: false,
      candidates: exact,
      confidence: 0.9,
      distance: 0,
    };
  }

  const scored = new Map();
  for (const phrase of candidatePhrasesFromText(text)) {
    const phraseCompact = compactLocalityKey(phrase);
    if (phraseCompact.length < 3) continue;
    // Skip ultra-generic single tokens that match dozens of localities
    if (['nagar', 'layout', 'road', 'area', 'puram', 'pura', 'city'].includes(phraseCompact)) {
      continue;
    }

    for (const entry of LOCALITY_LOOKUP) {
      const { compact, canonical } = entry;
      let distance = Infinity;
      if (phraseCompact === compact) distance = 0;
      else if (phraseCompact.includes(compact) || compact.includes(phraseCompact)) {
        distance = Math.abs(phraseCompact.length - compact.length);
      } else if (Math.abs(phraseCompact.length - compact.length) <= 3) {
        distance = levenshtein(phraseCompact, compact);
      } else {
        continue;
      }

      const allowed = maxFuzzyDistance(Math.min(phraseCompact.length, compact.length));
      if (distance > allowed) continue;

      const prev = scored.get(canonical);
      const confidence = 1 - distance / (Math.max(compact.length, 1) + 1);
      if (!prev || distance < prev.distance || (distance === prev.distance && confidence > prev.confidence)) {
        scored.set(canonical, { locality: canonical, distance, confidence });
      }
    }
  }

  const ranked = [...scored.values()].sort((a, b) => a.distance - b.distance || b.confidence - a.confidence);
  if (!ranked.length) return empty;

  const best = ranked[0];
  const second = ranked[1];
  const ambiguous =
    Boolean(second) &&
    (second.distance === best.distance ||
      (best.distance >= 2 && second.distance - best.distance <= 1));

  if (ambiguous) {
    return {
      locality: best.locality,
      matchType: 'fuzzy',
      needsConfirmation: true,
      candidates: ranked.slice(0, 3).map((r) => r.locality),
      confidence: best.confidence,
      distance: best.distance,
    };
  }

  return {
    locality: best.locality,
    matchType: best.distance === 0 ? 'alias' : 'fuzzy',
    needsConfirmation: best.distance > 2,
    candidates: [best.locality],
    confidence: best.confidence,
    distance: best.distance,
  };
}

export function shouldConfirmFuzzyLocality(result) {
  return Boolean(result?.needsConfirmation && result?.locality);
}

export function buildLocalityConfirmationPrompt(result) {
  if (!result?.locality) {
    return 'Which neighborhood or locality in Bengaluru do you prefer? For example Koramangala, Indiranagar, or Whitefield.';
  }
  if (result.matchType === 'confusable') {
    return 'Did you mean Indiranagar or R T Nagar? Please confirm once and I will continue.';
  }
  const alts = (result.candidates || []).filter((c) => c !== result.locality).slice(0, 2);
  if (alts.length) {
    return `Did you mean ${result.locality}, or perhaps ${alts.join(' or ')}? Please confirm once and I will continue.`;
  }
  return `Did you mean ${result.locality}? Please confirm once and I will continue.`;
}

/** Keep previously collected interview slots when ASR produces empty/noisy turns. */
export function mergePersistedInterviewSlots(persisted = {}, incoming = {}) {
  const localities =
    Array.isArray(incoming.localities) && incoming.localities.length > 0
      ? incoming.localities
      : Array.isArray(persisted.localities) && persisted.localities.length > 0
        ? persisted.localities
        : [];
  const locality =
    (incoming.locality && String(incoming.locality).trim()) ||
    (persisted.locality && String(persisted.locality).trim()) ||
    (localities[0] || '');
  const maxBudget =
    incoming.maxBudget !== null && incoming.maxBudget !== undefined
      ? incoming.maxBudget
      : persisted.maxBudget ?? null;
  const bedrooms =
    incoming.bedrooms !== null && incoming.bedrooms !== undefined && incoming.bedrooms !== ''
      ? incoming.bedrooms
      : persisted.bedrooms ?? null;
  const isPenthouse = Boolean(incoming.isPenthouse || persisted.isPenthouse);

  return {
    ...persisted,
    ...incoming,
    localities,
    locality,
    maxBudget,
    bedrooms,
    isPenthouse,
  };
}

export function extractLocalitiesFromText(text) {
  const exact = extractExactLocalitiesFromText(text);
  if (exact.length > 0) return exact;

  const fuzzy = fuzzyResolveLocality(text);
  if (fuzzy.locality && !fuzzy.needsConfirmation) {
    return [fuzzy.locality];
  }
  return [];
}

export function extractLocalityFromText(text) {
  const locs = extractLocalitiesFromText(text);
  if (locs.length === 0) return null;
  if (locs.length === 1) return locs[0];

  const textLower = text.toLowerCase();
  const pivotMarkers = ['instead', 'switch to', 'show me', 'forget', 'rather than', 'change to', 'make that'];
  let bestIdx = -1;
  let bestLoc = locs[locs.length - 1];

  for (const marker of pivotMarkers) {
    const idx = textLower.lastIndexOf(marker);
    if (idx >= bestIdx) {
      const segment = textLower.slice(idx);
      for (const locality of locs) {
        const locLower = locality.toLowerCase();
        const parts = locLower.split('/').map((p) => p.trim()).filter(Boolean);
        if (segment.includes(locLower) || parts.some((part) => segment.includes(part))) {
          bestLoc = locality;
          bestIdx = idx;
          break;
        }
      }
    }
  }
  return bestLoc;
}
