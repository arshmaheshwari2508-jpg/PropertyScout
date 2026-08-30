/**
 * Tests for context-aware rental/purchase intent detection.
 * Run: node --test tests/intent_detection.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPurchaseIntent,
  isRentalIntent,
  hasRentalSearchCriteria,
  getMissingRentalPrompt,
  isOutOfScopeQuery,
  OUT_OF_SCOPE_DECLINE_MSG,
} from '../src/utils/intentDetection.js';

test('isOutOfScopeQuery declines general knowledge questions', () => {
  assert.equal(isOutOfScopeQuery('Who is the prime minister of India'), true);
  assert.equal(isOutOfScopeQuery('what is the weather today'), true);
  assert.equal(isOutOfScopeQuery('tell me a joke'), true);
  assert.equal(isOutOfScopeQuery('who is the president of USA'), true);
});

test('isOutOfScopeQuery allows rental and property queries', () => {
  assert.equal(isOutOfScopeQuery('Find 2BHK in Indiranagar under 50000'), false);
  assert.equal(isOutOfScopeQuery('I want to rent in Koramangala'), false);
  assert.equal(isOutOfScopeQuery('how far is metro from Indiranagar'), false);
  assert.equal(isOutOfScopeQuery('Is Koramangala safe at night'), false);
});

test('isOutOfScopeQuery respects active rental context', () => {
  assert.equal(isOutOfScopeQuery('hello', { hasRentalContext: true }), false);
});

test('OUT_OF_SCOPE_DECLINE_MSG mentions rental-only scope', () => {
  assert.match(OUT_OF_SCOPE_DECLINE_MSG, /rental property/i);
  assert.match(OUT_OF_SCOPE_DECLINE_MSG, /Bengaluru/i);
});

test('isPurchaseIntent catches buy an apartment', () => {
  assert.equal(isPurchaseIntent('I want to buy an apartment'), true);
  assert.equal(isPurchaseIntent('I want to buy a 3BHK villa in Koramangala'), true);
  assert.equal(isPurchaseIntent('Switch to buyer mode'), true);
});

test('isPurchaseIntent does not flag rental queries', () => {
  assert.equal(isPurchaseIntent('I want to rent an apartment'), false);
  assert.equal(isPurchaseIntent('Find 2BHK rental in Indiranagar under 50000'), false);
});

test('isRentalIntent recognizes explicit rental statements', () => {
  assert.equal(isRentalIntent('I want to rent an apartment'), true);
  assert.equal(isRentalIntent('Looking to rent a flat in Whitefield'), true);
});

test('purchase takes precedence over rental keywords in same utterance', () => {
  assert.equal(isRentalIntent('I want to buy not rent'), false);
  assert.equal(isPurchaseIntent('I want to buy not rent'), true);
});

test('getMissingRentalPrompt guides next question from latest partial input', () => {
  assert.match(
    getMissingRentalPrompt({ localities: [], maxBudget: null, bedrooms: null }),
    /neighborhood/i
  );
  assert.match(
    getMissingRentalPrompt({ localities: ['Indiranagar'], locality: 'Indiranagar', maxBudget: null, bedrooms: null }),
    /Indiranagar/i
  );
});

test('hasRentalSearchCriteria detects actionable slots', () => {
  assert.equal(hasRentalSearchCriteria({ localities: ['Domlur'] }), true);
  assert.equal(hasRentalSearchCriteria({ budget: 40000 }), true);
  assert.equal(hasRentalSearchCriteria({ bhk: 2 }), true);
  assert.equal(hasRentalSearchCriteria({}), false);
});
