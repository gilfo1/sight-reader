import { DEFAULT_SOUND_MODE, getNextSoundMode, isSoundModeEnabled, SOUND_MODE, type SoundMode } from '@/audio/sound-mode';
const RELEASE_SECONDS = 0.15;
import {
  canUseAudioContext,
  createActiveTone,
  ensureAudioRouting,
  getAudioContext,
  noteToFrequency,
  resetAudioGraph,
  teardownActiveTone,
  type ActiveTone,
} from '@/audio/note-player-audio';

const activeNotes = new Map<string, ActiveTone>();
let soundMode: SoundMode = DEFAULT_SOUND_MODE;

function cleanupActiveNote(note: string, activeNote: ActiveTone): void {
  if (activeNotes.get(note) === activeNote) {
    activeNotes.delete(note);
  }

  teardownActiveTone(activeNote);
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
    const routing = ensureAudioRouting(context);
    const activeTone = createActiveTone(context, note);

    activeTone.gainNode.connect(routing.dryOutputGain);

    if (soundMode === SOUND_MODE.REVERB) {
      activeTone.gainNode.connect(routing.reverbConvolver);
    }

    activeNotes.set(note, activeTone);
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
  resetAudioGraph();
  soundMode = DEFAULT_SOUND_MODE;
}

export { noteToFrequency };
