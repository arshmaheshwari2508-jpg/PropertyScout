/**
 * Tests for voice interrupt / barge-in keyword detection.
 * Run: node --test tests/voice_interrupt.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeInterruptTranscript,
  isInterruptOnlyCommand,
  isSoftInterruptOnly,
  shouldTriggerBargeIn,
  shouldProcessBargeInTranscript,
} from '../src/utils/voiceInterrupt.js';

test('normalizeInterruptTranscript trims and collapses whitespace', () => {
  assert.equal(normalizeInterruptTranscript('  stop   '), 'stop');
  assert.equal(normalizeInterruptTranscript('wait.'), 'wait');
});

test('isInterruptOnlyCommand matches stop, wait, and variants', () => {
  assert.equal(isInterruptOnlyCommand('stop'), true);
  assert.equal(isInterruptOnlyCommand('Stop!'), true);
  assert.equal(isInterruptOnlyCommand('wait'), true);
  assert.equal(isInterruptOnlyCommand('hold on'), true);
  assert.equal(isInterruptOnlyCommand('pause'), true);
  assert.equal(isInterruptOnlyCommand('stop booking a site visit'), false);
});

test('isSoftInterruptOnly matches bare no/nope/nah', () => {
  assert.equal(isSoftInterruptOnly('no'), true);
  assert.equal(isSoftInterruptOnly('nope'), true);
  assert.equal(isSoftInterruptOnly('nah'), true);
  assert.equal(isSoftInterruptOnly('no I want Domlur'), false);
});

test('shouldTriggerBargeIn accepts any non-empty speech during playback', () => {
  assert.equal(shouldTriggerBargeIn('stop'), true);
  assert.equal(shouldTriggerBargeIn('wait'), true);
  assert.equal(shouldTriggerBargeIn('no'), true);
  assert.equal(shouldTriggerBargeIn('actually show me Koramangala'), true);
  assert.equal(shouldTriggerBargeIn(''), false);
  assert.equal(shouldTriggerBargeIn('   '), false);
});

test('shouldProcessBargeInTranscript distinguishes interrupt-only vs natural interruption', () => {
  assert.equal(shouldProcessBargeInTranscript('stop'), false);
  assert.equal(shouldProcessBargeInTranscript('wait'), false);
  assert.equal(shouldProcessBargeInTranscript('no'), false);
  assert.equal(shouldProcessBargeInTranscript('nope'), false);
  assert.equal(shouldProcessBargeInTranscript('no show me Whitefield instead'), true);
  assert.equal(shouldProcessBargeInTranscript('actually I want a 2BHK in Domlur'), true);
});
