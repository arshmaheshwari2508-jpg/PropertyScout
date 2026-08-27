/**
 * Voice interrupt detection — user speech takes priority over agent TTS.
 * Used for barge-in when the agent is speaking.
 */

const INTERRUPT_ONLY_PHRASES = new Set([
  'stop',
  'wait',
  'hold on',
  'hold up',
  'pause',
  'quiet',
  'shush',
  'enough',
  "that's enough",
  'ok stop',
  'okay stop',
]);

const SOFT_INTERRUPT_PHRASES = new Set(['no', 'nope', 'nah']);

/**
 * Normalize speech-to-text output for interrupt matching.
 */
export function normalizeInterruptTranscript(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '')
    .toLowerCase();
}

/**
 * True when transcript is only an interrupt command (stop, wait, etc.)
 * and should not be processed as a property query.
 */
export function isInterruptOnlyCommand(transcript) {
  const normalized = normalizeInterruptTranscript(transcript);
  if (!normalized) return false;
  return INTERRUPT_ONLY_PHRASES.has(normalized);
}

/**
 * True when transcript is a soft interrupt (e.g. "no") with no additional intent.
 */
export function isSoftInterruptOnly(transcript) {
  const normalized = normalizeInterruptTranscript(transcript);
  if (!normalized) return false;
  return SOFT_INTERRUPT_PHRASES.has(normalized);
}

/**
 * True when user speech should trigger barge-in while agent is speaking.
 */
export function shouldTriggerBargeIn(transcript) {
  const normalized = normalizeInterruptTranscript(transcript);
  if (!normalized) return false;
  // Any non-empty speech during agent playback is a barge-in candidate.
  return normalized.length >= 1;
}

/**
 * After barge-in, decide whether to process transcript as a query or just resume listening.
 */
export function shouldProcessBargeInTranscript(transcript) {
  const normalized = normalizeInterruptTranscript(transcript);
  if (!normalized) return false;
  if (isInterruptOnlyCommand(normalized)) return false;
  if (isSoftInterruptOnly(normalized)) return false;
  return true;
}
