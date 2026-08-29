// Auto-generated canonical Bengaluru localities (76 zones)
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
  "cantonment": "Cantonment Area",
  "cantonment area": "Cantonment Area",
  "hsr": "HSR Layout",
  "hsr layout": "HSR Layout",
  "jp nagar": "J. P. Nagar",
  "j p nagar": "J. P. Nagar",
  "jpnagar": "J. P. Nagar",
  "rt nagar": "R. T. Nagar",
  "r t nagar": "R. T. Nagar",
  "ulsoor": "Ulsoor / Halasuru",
  "halasuru": "Ulsoor / Halasuru",
  "koramangala": "Koramangala",
  "kormangala": "Koramangala",
  "indiranagar": "Indiranagar",
  "indira nagar": "Indiranagar",
  "white field": "Whitefield",
  "electronic city": "Electronic City",
  "ecity": "Electronic City",
  "marathahalli": "Marathahalli",
  "marathalli": "Marathahalli",
  "sarjapur": "Sarjapur Road",
  "sarjapur road": "Sarjapur Road"
};

export function extractLocalitiesFromText(text) {
  if (!text) return [];
  const q = text.toLowerCase();
  const matched = new Set();

  for (const [alias, canonical] of Object.entries(LOCALITY_ALIASES)) {
    if (q.includes(alias)) matched.add(canonical);
  }

  const sorted = [...CANONICAL_LOCALITIES].sort((a, b) => b.length - a.length);
  for (const loc of sorted) {
    const locLower = loc.toLowerCase();
    const parts = locLower.split('/').map((p) => p.trim());
    if (q.includes(locLower) || parts.some((part) => part && q.includes(part))) {
      matched.add(loc);
    }
  }

  return [...matched];
}

export function extractLocalityFromText(text) {
  const locs = extractLocalitiesFromText(text);
  return locs.length > 0 ? locs[0] : null;
}
