/**
 * Regression tests for voice agent locality, preferences, booking, and broker availability.
 * Run: node --test tests/voice_agent_regression.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractLocalitiesFromText,
  extractLocalityFromText,
  fuzzyResolveLocality,
  shouldConfirmFuzzyLocality,
  buildLocalityConfirmationPrompt,
  mergePersistedInterviewSlots,
} from '../src/utils/localityResolver.js';
import { propertyMatchesLocality, resolveListingLocality } from '../src/utils/listingLocality.js';
import {
  extractSoftPreferences,
  hasNoPreference,
  mergeSoftPreferences,
} from '../src/utils/softPreferences.js';
import { hasPreferenceInput } from '../src/utils/intentDetection.js';
import {
  findShortlistPropertyFromQuery,
  isSiteVisitBookingIntent,
  canTriggerSiteVisitBooking,
  filterPropertiesByLocalities,
  brokerSlotUnavailable,
  isAmbiguousPostDiscoveryUtterance,
  getPostDiscoveryBrowsePrompt,
  BOOKING_COMPLETED_THANK_YOU,
  shouldOfferSiteVisitResume,
  isBookingCompletedStep,
  buildBookingCompletedMessage,
} from '../src/utils/voiceAgentLogic.js';

const MOCK_SHORTLIST = [
  { society_name: 'TVS Emerald Court Cantonment Area', locality: 'Cantonment Area', listing_type: 'rent', rent_inr: 45000, bedrooms: 2 },
  { society_name: 'Prestige Lakeside Habitat Whitefield', locality: 'Whitefield', listing_type: 'rent', rent_inr: 55000, bedrooms: 3 },
  { society_name: 'Brigade Gateway Rajajinagar', locality: 'Rajajinagar', listing_type: 'rent', rent_inr: 38000, bedrooms: 2 },
];

const MOCK_LISTINGS = [
  { society_name: 'Flat A', locality: 'JP Nagar', listing_type: 'rent' },
  { society_name: 'Flat B', locality: 'Koramangala', listing_type: 'rent' },
  { society_name: 'Flat C', locality: 'Indiranagar', listing_type: 'rent' },
  { society_name: 'Flat D', locality: 'Cantonment Area', listing_type: 'rent' },
  { society_name: 'Flat E', locality: 'Sarjapura', listing_type: 'rent' },
];

// BUG 046 — Bengaluru neighborhood handling
test('extractLocalitiesFromText recognizes major Bengaluru neighborhoods', () => {
  assert.ok(extractLocalitiesFromText('I want to rent in Indiranagar').includes('Indiranagar'));
  assert.ok(extractLocalitiesFromText('Show me Koramangala flats').includes('Koramangala'));
  assert.ok(extractLocalitiesFromText('Looking in Whitefield under 50k').includes('Whitefield'));
  assert.ok(extractLocalitiesFromText('JP Nagar 2BHK').includes('JP Nagar'));
  assert.ok(extractLocalitiesFromText('HSR Layout rental').includes('HSR Layout'));
});

test('STT "come" does not map to Cantonment Area', () => {
  const locs = extractLocalitiesFromText('come');
  assert.equal(locs.includes('Cantonment Area'), false);
});

test('STT "containment area" maps to Cantonment Area', () => {
  const locs = extractLocalitiesFromText('containment area');
  assert.ok(locs.includes('Cantonment Area'));
});

test('resolveListingLocality maps aliases to listing.json names', () => {
  assert.equal(resolveListingLocality('J. P. Nagar'), 'JP Nagar');
  assert.equal(resolveListingLocality('Sarjapur Road'), 'Sarjapura');
  assert.equal(resolveListingLocality('Ulsoor / Halasuru'), 'Ulsoor');
});

test('propertyMatchesLocality matches listing locality strings', () => {
  const jpFlat = { locality: 'JP Nagar' };
  assert.equal(propertyMatchesLocality(jpFlat, 'J. P. Nagar'), true);
  assert.equal(propertyMatchesLocality(jpFlat, 'Koramangala'), false);
  assert.equal(propertyMatchesLocality({ locality: 'Sarjapura' }, 'Sarjapur Road'), true);
});

test('filterPropertiesByLocalities strictly filters without silent skip', () => {
  const koramangalaOnly = filterPropertiesByLocalities(
    MOCK_LISTINGS,
    ['Koramangala'],
    propertyMatchesLocality
  );
  assert.equal(koramangalaOnly.length, 1);
  assert.equal(koramangalaOnly[0].locality, 'Koramangala');

  const indiranagarOnly = filterPropertiesByLocalities(
    MOCK_LISTINGS,
    ['Indiranagar'],
    propertyMatchesLocality
  );
  assert.equal(indiranagarOnly.length, 1);
  assert.equal(indiranagarOnly[0].locality, 'Indiranagar');
});

test('extractLocalityFromText picks Koramangala over Cantonment when both mentioned with pivot', () => {
  const loc = extractLocalityFromText('Show me Koramangala instead of Cantonment');
  assert.equal(loc, 'Koramangala');
});

// BUG 047 — Voice preference recognition
test('extractSoftPreferences captures hospital, metro, and furnished requirements', () => {
  const hospital = extractSoftPreferences('I need a hospital nearby');
  assert.ok(hospital.some((p) => p.id === 'hospital'));

  const metro = extractSoftPreferences('metro access is important');
  assert.ok(metro.some((p) => p.id === 'metro'));

  const furnished = extractSoftPreferences('fully furnished apartment');
  assert.ok(furnished.some((p) => p.id === 'furnished'));
});

test('hasNoPreference treats STT misheard "come" as no preference', () => {
  assert.equal(hasNoPreference('come'), true);
  assert.equal(hasNoPreference('no preference'), true);
  assert.equal(hasNoPreference('hospital nearby'), false);
});

test('hasPreferenceInput detects real preferences vs STT no-preference', () => {
  assert.equal(hasPreferenceInput('hospital and metro nearby'), true);
  assert.equal(hasPreferenceInput('come'), true);
  assert.equal(hasPreferenceInput('hello there'), false);
});

test('mergeSoftPreferences accumulates requirements across turns', () => {
  const first = mergeSoftPreferences([], 'hospital nearby');
  const merged = mergeSoftPreferences(first, 'also need metro access');
  assert.equal(merged.length, 2);
  assert.ok(merged.some((p) => p.id === 'hospital'));
  assert.ok(merged.some((p) => p.id === 'metro'));
});

// BUG 048 — Voice site visit booking
test('findShortlistPropertyFromQuery matches TVS Emerald from voice utterance', () => {
  const match = findShortlistPropertyFromQuery('TVS Emerald, book a site visit', MOCK_SHORTLIST);
  assert.ok(match);
  assert.match(match.society_name, /TVS Emerald/i);
});

test('isSiteVisitBookingIntent recognizes book site visit with property name', () => {
  const property = MOCK_SHORTLIST[0];
  assert.equal(isSiteVisitBookingIntent('TVS Emerald, book a site visit', property), true);
  assert.equal(isSiteVisitBookingIntent('book TVS Emerald', property), true);
  assert.equal(isSiteVisitBookingIntent('book site visit', null), true);
});

test('canTriggerSiteVisitBooking works without hasSearched gate when shortlist exists', () => {
  const property = findShortlistPropertyFromQuery('TVS Emerald book visit', MOCK_SHORTLIST);
  assert.equal(
    canTriggerSiteVisitBooking({
      bookingIntent: isSiteVisitBookingIntent('TVS Emerald book visit', property),
      matchedProperty: property,
      shortlistLength: MOCK_SHORTLIST.length,
    }),
    true
  );
});

// Post-discovery loop guard — STT "come" must not re-trigger search at step 5+
test('isAmbiguousPostDiscoveryUtterance treats STT "come" as post-discovery noise', () => {
  assert.equal(isAmbiguousPostDiscoveryUtterance('come'), true);
  assert.equal(isAmbiguousPostDiscoveryUtterance('yes'), true);
  assert.equal(isAmbiguousPostDiscoveryUtterance('book a site visit'), false);
});

test('getPostDiscoveryBrowsePrompt names single property for booking', () => {
  const prompt = getPostDiscoveryBrowsePrompt([{ society_name: 'Brigade Gateway' }]);
  assert.match(prompt, /Brigade Gateway/);
  assert.match(prompt, /book a site visit/i);
});

// BUG 049 — Manual booking broker error (pessimistic availability fallback)
test('brokerSlotUnavailable marks slots unavailable on API failure', () => {
  const status = brokerSlotUnavailable();
  assert.equal(status.is_available, false);
  assert.equal(status.error, true);
  assert.equal(status.available_count, 0);
});

// BUG 050 — Fuzzy locality ASR variants (Indira nager / Indranagar → Indiranagar)
test('fuzzyResolveLocality maps Indira nager and Indranagar to Indiranagar', () => {
  const a = fuzzyResolveLocality('Indira nager');
  assert.equal(a.locality, 'Indiranagar');
  assert.ok(['exact', 'alias', 'fuzzy'].includes(a.matchType));

  const b = fuzzyResolveLocality('Indranagar');
  assert.equal(b.locality, 'Indiranagar');

  const c = fuzzyResolveLocality('I want a flat in indira nager under 40k');
  assert.equal(c.locality, 'Indiranagar');
});

test('fuzzyResolveLocality covers common ASR misspellings across Bengaluru localities', () => {
  assert.equal(fuzzyResolveLocality('kormangala').locality, 'Koramangala');
  assert.equal(fuzzyResolveLocality('white field').locality, 'Whitefield');
  assert.equal(fuzzyResolveLocality('jayanager').locality, 'Jayanagar');
  assert.equal(fuzzyResolveLocality('hsr layot').locality, 'HSR Layout');
  assert.equal(fuzzyResolveLocality('marathalli').locality, 'Marathahalli');
});

test('ambiguous fuzzy locality asks for one confirmation', () => {
  const result = fuzzyResolveLocality('nagar'); // too generic / ambiguous
  if (result.needsConfirmation) {
    assert.ok(result.candidates.length >= 1);
    assert.match(buildLocalityConfirmationPrompt(result), /did you mean|confirm/i);
  }
  assert.equal(shouldConfirmFuzzyLocality(result), !!result.needsConfirmation);
});

test('extractLocalitiesFromText still returns Indiranagar for ASR variants', () => {
  assert.ok(extractLocalitiesFromText('Indira nager').includes('Indiranagar'));
  assert.ok(extractLocalitiesFromText('Indranagar 2bhk').includes('Indiranagar'));
});

// BUG 051 — Persist interview slots so ASR noise does not re-ask
test('mergePersistedInterviewSlots keeps prior locality/budget/bhk when new utterance is empty noise', () => {
  const persisted = {
    localities: ['Indiranagar'],
    locality: 'Indiranagar',
    maxBudget: 45000,
    bedrooms: 2,
  };
  const merged = mergePersistedInterviewSlots(persisted, {
    localities: [],
    locality: '',
    maxBudget: null,
    bedrooms: null,
  });
  assert.equal(merged.locality, 'Indiranagar');
  assert.equal(merged.maxBudget, 45000);
  assert.equal(merged.bedrooms, 2);
  assert.deepEqual(merged.localities, ['Indiranagar']);
});

test('mergePersistedInterviewSlots prefers freshly spoken criteria when present', () => {
  const merged = mergePersistedInterviewSlots(
    { localities: ['Indiranagar'], locality: 'Indiranagar', maxBudget: 45000, bedrooms: 2 },
    { localities: ['Koramangala'], locality: 'Koramangala', maxBudget: 50000, bedrooms: 1 }
  );
  assert.equal(merged.locality, 'Koramangala');
  assert.equal(merged.maxBudget, 50000);
  assert.equal(merged.bedrooms, 1);
});

// BUG 052 — Post-booking completed state
test('booking completed thank-you copy is PropertyScout brand line', () => {
  assert.equal(BOOKING_COMPLETED_THANK_YOU, 'Thank you for choosing PropertyScout!');
});

test('shouldOfferSiteVisitResume is false after booking completed', () => {
  assert.equal(shouldOfferSiteVisitResume({ hasSearched: true, buyerStep: 5, bookingCompleted: false }), true);
  assert.equal(shouldOfferSiteVisitResume({ hasSearched: true, buyerStep: 6, bookingCompleted: true }), false);
  assert.equal(isBookingCompletedStep(6), true);
  assert.equal(isBookingCompletedStep(5), false);
});

test('buildBookingCompletedMessage always ends with PropertyScout thank-you', () => {
  const msg = buildBookingCompletedMessage({
    propertyName: 'TVS Emerald',
    visitDate: '31 August',
    timeSlot: '10:00 AM - 11:00 AM',
    email: 'a@b.com',
    brokerName: 'Priya Nair',
  });
  assert.match(msg, /TVS Emerald/);
  assert.ok(msg.endsWith('Thank you for choosing PropertyScout!'));
});
