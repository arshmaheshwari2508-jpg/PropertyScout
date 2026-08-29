const PREFERENCE_RULES = [
  {
    id: 'hospital',
    keywords: ['hospital', 'doctor', 'medical', 'clinic', 'healthcare', 'health care'],
    label: 'hospital nearby',
    localityHints: {
      Koramangala: "St. John's Medical College & Hospital is under 1.2 km",
      Indiranagar: 'Manipal Hospital Indiranagar is under 0.8 km',
      'HSR Layout': 'Narayana Multispeciality Hospital HSR is under 1.1 km',
      Whitefield: 'Manipal Hospital Whitefield is under 0.9 km',
      'Cantonment Area': 'Bowring & Lady Curzon Hospital is under 1.5 km',
    },
    defaultHint: '24/7 emergency hospitals are within 1.5 km',
  },
  {
    id: 'metro',
    keywords: ['metro', 'namma metro', 'train', 'transit', 'station', 'commute'],
    label: 'metro access',
    localityHints: {
      Indiranagar: 'Indiranagar Metro Station is within walking distance',
      Whitefield: 'Whitefield (Kadugodi) Metro Station is under 1 km',
      'HSR Layout': 'Silk Board Metro Station is under 1.5 km',
      Jayanagar: 'Jayanagar Metro Station is under 1 km',
      'Cantonment Area': 'Cubbon Park Metro Station is under 2 km',
    },
    defaultHint: 'Namma Metro connectivity is available nearby',
  },
  {
    id: 'school',
    keywords: ['school', 'kids', 'education', 'college', 'university'],
    label: 'schools nearby',
    defaultHint: 'reputed schools and colleges are nearby',
  },
  {
    id: 'park',
    keywords: ['park', 'lake', 'green', 'quiet', 'peaceful', 'nature'],
    label: 'parks or green spaces',
    defaultHint: 'parks and green spaces are accessible nearby',
  },
  {
    id: 'mall',
    keywords: ['mall', 'shopping', 'market', 'shop', 'store', 'retail'],
    label: 'shopping nearby',
    defaultHint: 'shopping and daily retail options are nearby',
  },
  {
    id: 'furnished',
    keywords: ['fully furnished', 'full furnished', 'semi furnished', 'semi-furnished', 'furnished'],
    label: 'furnishing preference',
    propertyField: 'furnishing',
  },
  {
    id: 'pets',
    keywords: ['pet', 'pets', 'dog', 'cat', 'pet friendly', 'pet-friendly'],
    label: 'pet-friendly homes',
    defaultHint: 'the society allows pets on approval',
  },
  {
    id: 'security',
    keywords: ['security', 'gated', 'cctv', 'safe society'],
    label: 'secure society',
    defaultHint: '24/7 security and CCTV are available',
  },
];

const NO_PREFERENCE_PATTERN = /\b(no preference|no specific|nothing specific|none|not really|doesn?t matter|skip|any is fine|no requirements?|no prefer|come|comm|calm)\b/i;

export function hasNoPreference(text) {
  return NO_PREFERENCE_PATTERN.test(text || '');
}

export function extractSoftPreferences(text) {
  if (!text || hasNoPreference(text)) return [];
  const q = text.toLowerCase();
  return PREFERENCE_RULES.filter((rule) => rule.keywords.some((keyword) => q.includes(keyword)));
}

export function mergeSoftPreferences(existing = [], latestText = '') {
  const merged = new Map();
  for (const pref of existing || []) merged.set(pref.id, pref);
  for (const pref of extractSoftPreferences(latestText)) merged.set(pref.id, pref);
  return [...merged.values()];
}

export function describePreferences(preferences = []) {
  if (!preferences.length) return '';
  return preferences.map((pref) => pref.label).join(', ');
}

export function scorePropertyForPreferences(property, preferences = []) {
  if (!property || !preferences.length) return 0;
  let score = 0;
  const description = `${property.description || ''} ${property.society_name || ''} ${property.furnishing || ''}`.toLowerCase();
  const locality = property.locality || '';

  for (const pref of preferences) {
    if (pref.id === 'furnished') {
      if (property.furnishing?.toLowerCase().includes('fully')) score += 3;
      else if (property.furnishing?.toLowerCase().includes('furnished')) score += 2;
      continue;
    }
    if (pref.localityHints?.[locality]) score += 4;
    else if (pref.defaultHint) score += 1;
    if (pref.keywords.some((keyword) => description.includes(keyword))) score += 1;
  }
  return score;
}

export function getPropertyPreferenceReason(property, preferences = []) {
  if (!property || !preferences.length) return '';
  const locality = property.locality || '';
  const reasons = [];

  for (const pref of preferences) {
    if (pref.id === 'furnished') {
      if (property.furnishing) {
        reasons.push(`matches your ${property.furnishing.toLowerCase()} requirement`);
      }
      continue;
    }
    const hint = pref.localityHints?.[locality] || pref.defaultHint;
    if (hint) reasons.push(hint);
  }

  if (!reasons.length) return '';
  return `Shortlisted because ${reasons.slice(0, 2).join(' and ')}.`;
}

export function buildShortlistVerdict({ properties = [], preferences = [], locality = '', budget = null, bedrooms = null }) {
  const count = properties.length;
  const parts = [];

  if (locality) parts.push(`in ${locality}`);
  if (bedrooms) {
    const bhkText = Array.isArray(bedrooms) ? `${bedrooms.join(' or ')} BHK` : `${bedrooms} BHK`;
    parts.push(`for ${bhkText}`);
  }
  if (budget) parts.push(`within your budget`);

  const criteriaText = parts.length ? ` matching your search ${parts.join(', ')}` : '';
  const prefText = describePreferences(preferences);
  const prefClause = prefText ? ` I also prioritized your requirements: ${prefText}.` : '';

  const reason = getPropertyPreferenceReason(properties[0], preferences);
  const reasonClause = reason ? ` ${reason}` : '';

  return `I found ${count} rental ${count === 1 ? 'option' : 'options'}${criteriaText}.${prefClause}${reasonClause} They're on your screen — tell me which one you'd like to book a site visit for.`;
}

export { PREFERENCE_RULES };
