/** Maps voice/canonical locality names to exact strings used in listings.json */

export const LISTING_LOCALITY_ALIASES = {
  'j. p. nagar': 'JP Nagar',
  'jp nagar': 'JP Nagar',
  'j p nagar': 'JP Nagar',
  'jpnagar': 'JP Nagar',
  'sarjapur road': 'Sarjapura',
  sarjapur: 'Sarjapura',
  'ulsoor / halasuru': 'Ulsoor',
  ulsoor: 'Ulsoor',
  halasuru: 'Ulsoor',
  'krishnarajapuram / kr puram': 'Krishnarajapuram',
  'kr puram': 'Krishnarajapuram',
  'cantonment area': 'Cantonment Area',
  cantonment: 'Cantonment Area',
  'containment area': 'Cantonment Area',
  'r. t. nagar': 'R. T. Nagar',
  'rt nagar': 'R. T. Nagar',
  'r t nagar': 'R. T. Nagar',
  koramangala: 'Koramangala',
  kormangala: 'Koramangala',
  indiranagar: 'Indiranagar',
  'indira nagar': 'Indiranagar',
  whitefield: 'Whitefield',
  'white field': 'Whitefield',
  'hsr layout': 'HSR Layout',
  hsr: 'HSR Layout',
  'electronic city': 'Electronic City',
  ecity: 'Electronic City',
  marathahalli: 'Marathahalli',
  marathalli: 'Marathahalli',
  domlur: 'Domlur',
  hebbal: 'Hebbal',
  bellandur: 'Bellandur',
  mahadevapura: 'Mahadevapura',
  jayanagar: 'Jayanagar',
};

export function resolveListingLocality(locality) {
  if (!locality) return locality;
  const key = locality.toLowerCase().trim();
  return LISTING_LOCALITY_ALIASES[key] || locality;
}

export function propertyMatchesLocality(property, targetLocality) {
  if (!property?.locality || !targetLocality) return false;
  const listingLoc = property.locality.toLowerCase();
  const resolved = resolveListingLocality(targetLocality).toLowerCase();
  return listingLoc.includes(resolved) || resolved.includes(listingLoc);
}
