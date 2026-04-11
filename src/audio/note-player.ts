import { getNoteValue } from '@/utils/theory';
import { DEFAULT_SOUND_MODE, getNextSoundMode, isSoundModeEnabled, SOUND_MODE, type SoundMode } from '@/audio/sound-mode';

interface ActiveTone {
  gainNode: GainNode;
  oscillator: OscillatorNode;
  releaseTimeoutId?: number;
}

const ATTACK_SECONDS = 0.01;
const RELEASE_SECONDS = 0.15;
const REVERB_DECAY_SECONDS = 1.1;
const REVERB_DURATION_SECONDS = 1.6;
const REVERB_WET_LEVEL = 0.24;
const activeNotes = new Map<string, ActiveTone>();
let audioContext: AudioContext | null = null;
let dryOutputGain: GainNode | null = null;
let reverbConvolver: ConvolverNode | null = null;
let reverbOutputGain: GainNode | null = null;
let soundMode: SoundMode = DEFAULT_SOUND_MODE;

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

function canUseAudioContext(): boolean {
  return getAudioContextConstructor() !== null && !window.navigator.userAgent.includes('jsdom');
}

function getAudioContext(): AudioContext | null {
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

function resetAudioRouting(): void {
  dryOutputGain = null;
  reverbConvolver = null;
  reverbOutputGain = null;
}

function ensureAudioRouting(context: AudioContext): void {
  if (!dryOutputGain) {
    dryOutputGain = context.createGain();
    dryOutputGain.gain.value = 1;
    dryOutputGain.connect(context.destination);
  }

  if (!reverbConvolver) {
    reverbConvolver = context.createConvolver();
    reverbConvolver.buffer = createImpulseResponse(context, REVERB_DURATION_SECONDS, REVERB_DECAY_SECONDS);
  }

  if (!reverbOutputGain) {
    reverbOutputGain = context.createGain();
    reverbOutputGain.gain.value = REVERB_WET_LEVEL;
    reverbOutputGain.connect(context.destination);
  }

  reverbConvolver.connect(reverbOutputGain);
}

function teardownActiveTone(activeNote: ActiveTone): void {
  if (activeNote.releaseTimeoutId !== undefined) {
    clearTimeout(activeNote.releaseTimeoutId);
  }

  try {
    activeNote.oscillator.disconnect();
  } catch {}

  try {
    activeNote.gainNode.disconnect();
  } catch {}
}

function cleanupActiveNote(note: string, activeNote: ActiveTone): void {
  if (activeNotes.get(note) === activeNote) {
    activeNotes.delete(note);
  }

  teardownActiveTone(activeNote);
}

export function noteToFrequency(note: string): number {
  return 440 * Math.pow(2, (getNoteValue(note) - 69) / 12);
}

export function isSoundEnabled(): boolean {
  return isSoundModeEnabled(soundMode);
}

export function getSoundMode(): SoundMode {
  return soundMode;
}

export function setSoundMode(mode: SoundMode): void {
  soundMode = mode;

  if (!isSoundModeEnabled(mode)) {
    stopAllNotes();
  }
}

export function setSoundEnabled(enabled: boolean): void {
  setSoundMode(enabled ? SOUND_MODE.ON : SOUND_MODE.OFF);
}

export function isReverbEnabled(): boolean {
  return soundMode === SOUND_MODE.REVERB;
}

export function toggleSoundMode(): SoundMode {
  const nextMode = getNextSoundMode(soundMode);
  setSoundMode(nextMode);
  return nextMode;
}

export function toggleSoundEnabled(): boolean {
  return isSoundModeEnabled(toggleSoundMode());
}

export function playNote(note: string): void {
  if (!isSoundModeEnabled(soundMode) || activeNotes.has(note) || !canUseAudioContext()) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (typeof context.resume === 'function') {
    context.resume().catch(() => undefined);
  }

  try {
    ensureAudioRouting(context);

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(noteToFrequency(note), now);

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + ATTACK_SECONDS);

    oscillator.connect(gainNode);
    gainNode.connect(dryOutputGain!);

    if (soundMode === SOUND_MODE.REVERB && reverbConvolver) {
      gainNode.connect(reverbConvolver);
    }

    oscillator.start(now);

    activeNotes.set(note, { oscillator, gainNode });
  } catch {
    activeNotes.delete(note);
  }
}

export function stopNote(note: string): void {
  const activeNote = activeNotes.get(note);

  if (!activeNote) {
    return;
  }

  const context = getAudioContext();
  const now = context?.currentTime ?? 0;

  try {
    activeNotes.delete(note);
    activeNote.gainNode.gain.cancelScheduledValues(now);
    activeNote.gainNode.gain.setValueAtTime(Math.max(activeNote.gainNode.gain.value, 0.0001), now);
    activeNote.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + RELEASE_SECONDS);
    activeNote.oscillator.stop(now + RELEASE_SECONDS);
    activeNote.oscillator.onended = () => cleanupActiveNote(note, activeNote);
    activeNote.releaseTimeoutId = window.setTimeout(() => cleanupActiveNote(note, activeNote), Math.ceil(RELEASE_SECONDS * 1000) + 32);
  } catch {
    cleanupActiveNote(note, activeNote);
  }
}

export function stopAllNotes(): void {
  Array.from(activeNotes.keys()).forEach(stopNote);
}

export function resetAudioPlayer(): void {
  stopAllNotes();
  audioContext = null;
  resetAudioRouting();
  soundMode = DEFAULT_SOUND_MODE;
}
