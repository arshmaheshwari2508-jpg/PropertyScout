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
  getOutOfScopeResponse,
  isAffirmativeResponse,
  isNegativeResponse,
  getScopeContinueResumePrompt,
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

test('getOutOfScopeResponse asks to continue without being overly long', () => {
  const msg = getOutOfScopeResponse();
  assert.ok(msg.length >= 100 && msg.length < 320);
  assert.match(msg, /rentals|scout/i);
  assert.match(msg, /yes or no/i);
});

test('scope continue yes/no helpers', () => {
  assert.equal(isAffirmativeResponse('yes'), true);
  assert.equal(isAffirmativeResponse('yeah sure'), true);
  assert.equal(isNegativeResponse('no'), true);
  assert.equal(isNegativeResponse('nope'), true);
  assert.equal(isAffirmativeResponse('no'), false);
});

test('getScopeContinueResumePrompt resumes missing slot question', () => {
  assert.match(getScopeContinueResumePrompt({}), /Bengaluru|neighborhood/i);
  assert.match(
    getScopeContinueResumePrompt({ localities: ['Indiranagar'], locality: 'Indiranagar' }),
    /Indiranagar/i
  );
});

test('getScopeContinueResumePrompt re-asks requirements at step 4', () => {
  const prompt = getScopeContinueResumePrompt(
    {
      localities: ['Indiranagar'],
      locality: 'Indiranagar',
      maxBudget: 50000,
      bedrooms: 2,
      requirementsAsked: true,
    },
    { buyerStep: 4, hasSearched: false }
  );
  assert.match(prompt, /must-haves/i);
  assert.match(prompt, /Indiranagar/i);
});

test('getMissingRentalPrompt uses clear conversational copy', () => {
  const prompt = getMissingRentalPrompt({ localities: [], maxBudget: null, bedrooms: null });
  assert.ok(prompt.length >= 60 && prompt.length < 220);
  assert.match(prompt, /neighborhood|area|Bengaluru/i);
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
    /neighborhood|area/i
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
