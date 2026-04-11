export interface AudioRouting {
  dryOutputGain: GainNode;
  reverbConvolver: ConvolverNode;
  reverbOutputGain: GainNode;
}

const REVERB_DECAY_SECONDS = 1.1;
const REVERB_DURATION_SECONDS = 1.6;
const REVERB_WET_LEVEL = 0.24;

let audioContext: AudioContext | null = null;
let audioRouting: AudioRouting | null = null;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const globalAudio = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };

  return globalAudio.AudioContext ?? globalAudio.webkitAudioContext ?? null;
}

export function canUseAudioContext(): boolean {
  return typeof window !== 'undefined'
    && getAudioContextConstructor() !== null
    && !window.navigator.userAgent.includes('jsdom');
}

export function getAudioContext(): AudioContext | null {
  if (audioContext) {
    return audioContext;
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return null;
  }

  try {
    audioContext = new AudioContextConstructor();
  } catch {
    audioContext = null;
  }

  return audioContext;
}

function createImpulseResponse(context: AudioContext, durationSeconds: number, decaySeconds: number): AudioBuffer {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const impulse = context.createBuffer(2, frameCount, context.sampleRate);

  for (let channelIndex = 0; channelIndex < impulse.numberOfChannels; channelIndex += 1) {
    const channel = impulse.getChannelData(channelIndex);

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const decay = Math.pow(1 - frameIndex / frameCount, decaySeconds);
      channel[frameIndex] = (Math.random() * 2 - 1) * decay;
    }
  }

  return impulse;
}

export function ensureAudioRouting(context: AudioContext): AudioRouting {
  if (audioRouting) {
    return audioRouting;
  }

  const dryOutputGain = context.createGain();
  dryOutputGain.gain.value = 1;
  dryOutputGain.connect(context.destination);

  const reverbConvolver = context.createConvolver();
  reverbConvolver.buffer = createImpulseResponse(context, REVERB_DURATION_SECONDS, REVERB_DECAY_SECONDS);

  const reverbOutputGain = context.createGain();
  reverbOutputGain.gain.value = REVERB_WET_LEVEL;
  reverbOutputGain.connect(context.destination);
  reverbConvolver.connect(reverbOutputGain);

  audioRouting = {
    dryOutputGain,
    reverbConvolver,
    reverbOutputGain,
  };

  return audioRouting;
}

export function resetAudioGraph(): void {
  audioContext = null;
  audioRouting = null;
}
