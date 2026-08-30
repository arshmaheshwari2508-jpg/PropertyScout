/**
 * Web Audio API voice activity detection for hands-free barge-in.
 * Detects when the user starts speaking so agent TTS can be interrupted immediately.
 */

const DEFAULT_OPTIONS = {
  /** RMS energy threshold (0–1). Higher = less sensitive to speaker bleed. */
  threshold: 0.034,
  /** Minimum sustained speech duration before firing onSpeechStart (ms). */
  minSpeechMs: 220,
  /** Silence duration before firing onSpeechEnd (ms). */
  silenceMs: 350,
  /** Ignore detections until TTS echo has settled (laptop speakers). */
  warmupMs: 1800,
};

function computeRms(analyser, buffer) {
  analyser.getByteTimeDomainData(buffer);
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    const sample = (buffer[i] - 128) / 128;
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

/**
 * @param {object} options
 * @param {() => void} [options.onSpeechStart] - Fired once when user speech begins.
 * @param {() => void} [options.onSpeechEnd] - Fired when user speech ends.
 * @param {number} [options.threshold]
 * @param {number} [options.minSpeechMs]
 * @param {number} [options.silenceMs]
 * @param {number} [options.warmupMs]
 * @param {MediaStream} [options.existingStream] - Reuse an open mic stream.
 */
export async function createVoiceActivityDetector(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { onSpeechStart, onSpeechEnd } = config;

  let audioContext = null;
  let analyser = null;
  let source = null;
  let stream = null;
  let ownsStream = false;
  let rafId = null;
  let speechStarted = false;
  let speechStartTime = 0;
  let lastSpeechTime = 0;
  let startedAt = 0;
  let stopped = false;

  const buffer = new Uint8Array(512);

  const tick = () => {
    if (stopped || !analyser) return;

    const now = performance.now();
    const rms = computeRms(analyser, buffer);
    const pastWarmup = now - startedAt >= config.warmupMs;

    if (rms >= config.threshold && pastWarmup) {
      lastSpeechTime = now;
      if (!speechStarted) {
        if (!speechStartTime) speechStartTime = now;
        if (now - speechStartTime >= config.minSpeechMs) {
          speechStarted = true;
          onSpeechStart?.();
        }
      }
    } else if (speechStarted && now - lastSpeechTime >= config.silenceMs) {
      speechStarted = false;
      speechStartTime = 0;
      onSpeechEnd?.();
    } else if (!speechStarted) {
      speechStartTime = 0;
    }

    rafId = requestAnimationFrame(tick);
  };

  const start = async () => {
    stopped = false;
    speechStarted = false;
    speechStartTime = 0;
    lastSpeechTime = 0;
    startedAt = performance.now();

    if (config.existingStream) {
      stream = config.existingStream;
      ownsStream = false;
    } else {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      ownsStream = true;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.35;
    source.connect(analyser);

    rafId = requestAnimationFrame(tick);
    return stream;
  };

  const stop = () => {
    stopped = true;
    speechStarted = false;
    speechStartTime = 0;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (source) {
      try { source.disconnect(); } catch (_) {}
      source = null;
    }

    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }

    analyser = null;

    if (ownsStream && stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    stream = null;
    ownsStream = false;
  };

  return { start, stop, getStream: () => stream };
}
