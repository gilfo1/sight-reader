import { getNoteValue } from '@/utils/theory';

interface ActiveTone {
  gainNode: GainNode;
  oscillator: OscillatorNode;
  releaseTimeoutId?: number;
}

const ATTACK_SECONDS = 0.01;
const RELEASE_SECONDS = 0.05;
const activeNotes = new Map<string, ActiveTone>();
let audioContext: AudioContext | null = null;
let soundEnabled = true;

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
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;

  if (!enabled) {
    stopAllNotes();
  }
}

export function toggleSoundEnabled(): boolean {
  setSoundEnabled(!soundEnabled);
  return soundEnabled;
}

export function playNote(note: string): void {
  if (!soundEnabled || activeNotes.has(note) || !canUseAudioContext()) {
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
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(noteToFrequency(note), now);

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + ATTACK_SECONDS);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
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
  audioContext = null;
}
