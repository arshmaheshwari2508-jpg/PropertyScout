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
  "krishnarajapuram": "Krishnarajapuram"
};

export function extractLocalitiesFromText(text) {
  if (!text) return [];
  const q = text.toLowerCase();
  const matched = new Set();

  for (const [alias, canonical] of Object.entries(LOCALITY_ALIASES)) {
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
