import { getNoteValue } from '@/utils/theory';
import {
  canUseAudioContext,
  ensureAudioRouting,
  getAudioContext,
  resetAudioGraph,
  type AudioRouting,
} from '@/audio/note-player-context';

export interface ActiveTone {
  gainNode: GainNode;
  oscillator: OscillatorNode;
  releaseTimeoutId?: number;
}

const ATTACK_SECONDS = 0.01;

export function teardownActiveTone(activeNote: ActiveTone): void {
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

export function createActiveTone(context: AudioContext, note: string): ActiveTone {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const now = context.currentTime;

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(noteToFrequency(note), now);

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.18, now + ATTACK_SECONDS);

  oscillator.connect(gainNode);
  oscillator.start(now);

  return { oscillator, gainNode };
}

export function noteToFrequency(note: string): number {
  return 440 * Math.pow(2, (getNoteValue(note) - 69) / 12);
}

export { canUseAudioContext, ensureAudioRouting, getAudioContext, resetAudioGraph, type AudioRouting };
