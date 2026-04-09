import { loadFromStorage, saveToStorage } from '@/utils/storage';

export interface AppStats {
  notesPlayed: number;
  correctNotes: number;
  wrongNotes: number;
  currentStreak: number;
  maxStreak: number;
  wrongOctaveCount: number;
  keySignatureNotHonoredCount: number;
  totalCorrectNoteTime: number;
  averageCorrectNoteTime: number;
  troubleNotes: Record<string, number>;
  troubleOctaves: Record<string, number>;
  troubleKeys: Record<string, number>;
  slowNoteTimes: Record<string, number[]>;
  wrongOctaveNotes: Record<string, number>;
  keySignatureMissedNotes: Record<string, number>;
}

const STATS_STORAGE_KEY = 'app-stats';
const MAX_NOTE_TIMING_SAMPLES = 10;

function getDefaultStats(): AppStats {
  return {
    notesPlayed: 0,
    correctNotes: 0,
    wrongNotes: 0,
    currentStreak: 0,
    maxStreak: 0,
    wrongOctaveCount: 0,
    keySignatureNotHonoredCount: 0,
    totalCorrectNoteTime: 0,
    averageCorrectNoteTime: 0,
    troubleNotes: {},
    troubleOctaves: {},
    troubleKeys: {},
    slowNoteTimes: {},
    wrongOctaveNotes: {},
    keySignatureMissedNotes: {},
  };
}

function saveStats(): void {
  saveToStorage(STATS_STORAGE_KEY, stats);
}

function decrementIfPresent(record: Record<string, number>, key: string): void {
  if ((record[key] ?? 0) > 0) {
    record[key]!--;
  }
}

function incrementEach(record: Record<string, number>, keys: string[]): void {
  keys.forEach((key) => {
    record[key] = (record[key] ?? 0) + 1;
  });
}

function getOctave(noteIdentifier: string): string | null {
  return noteIdentifier.match(/\d+/)?.[0] ?? null;
}

function getNoteName(noteIdentifier: string): string {
  return noteIdentifier.replace(/\d+/, '');
}

function isWrongOctave(playedNote: string, targetNote: string): boolean {
  return getNoteName(playedNote) === getNoteName(targetNote) && getOctave(playedNote) !== getOctave(targetNote);
}

function isKeySignatureMiss(playedNote: string, targetNote: string): boolean {
  return getNoteName(playedNote).charAt(0) === getNoteName(targetNote).charAt(0)
    && getNoteName(playedNote) !== getNoteName(targetNote);
}

export const stats: AppStats = {
  ...getDefaultStats(),
  ...(loadFromStorage<AppStats>(STATS_STORAGE_KEY) ?? {}),
};

export function resetStats(): void {
  Object.assign(stats, getDefaultStats());
  saveStats();
}

export function recordCorrectNote(noteIdentifier: string, keySignature: string, timeMs?: number): void {
  stats.notesPlayed++;
  stats.correctNotes++;
  stats.currentStreak++;
  stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);

  if (timeMs !== undefined) {
    stats.totalCorrectNoteTime += timeMs;
    stats.averageCorrectNoteTime = stats.totalCorrectNoteTime / stats.correctNotes;

    const noteTimes = stats.slowNoteTimes[noteIdentifier] ?? [];
    noteTimes.push(timeMs);

    if (noteTimes.length > MAX_NOTE_TIMING_SAMPLES) {
      noteTimes.shift();
    }

    stats.slowNoteTimes[noteIdentifier] = noteTimes;
  }

  decrementIfPresent(stats.troubleNotes, noteIdentifier);

  const octave = getOctave(noteIdentifier);
  if (octave) {
    decrementIfPresent(stats.troubleOctaves, octave);
  }

  decrementIfPresent(stats.troubleKeys, keySignature);
  decrementIfPresent(stats.wrongOctaveNotes, noteIdentifier);
  decrementIfPresent(stats.keySignatureMissedNotes, noteIdentifier);
  saveStats();
}

export function recordWrongNote(playedNote: string, targetPitches: string[], currentKey: string): void {
  stats.notesPlayed++;
  stats.wrongNotes++;
  stats.currentStreak = 0;

  const wrongOctaveTargets = targetPitches.filter((targetPitch) => {
    const keySignatureMiss = isKeySignatureMiss(playedNote, targetPitch);
    const octaveMiss = getOctave(playedNote) !== getOctave(targetPitch);
    return isWrongOctave(playedNote, targetPitch) || (keySignatureMiss && octaveMiss);
  });
  const keySignatureMissTargets = targetPitches.filter((targetPitch) => isKeySignatureMiss(playedNote, targetPitch));

  if (wrongOctaveTargets.length > 0) {
    stats.wrongOctaveCount++;
    incrementEach(stats.wrongOctaveNotes, targetPitches);
  }

  if (keySignatureMissTargets.length > 0) {
    stats.keySignatureNotHonoredCount++;
    incrementEach(stats.keySignatureMissedNotes, targetPitches);
  }

  incrementEach(stats.troubleNotes, targetPitches);

  const octaves = targetPitches
    .map(getOctave)
    .filter((octave): octave is string => octave !== null);
  incrementEach(stats.troubleOctaves, octaves);

  if (targetPitches.length > 0) {
    stats.troubleKeys[currentKey] = (stats.troubleKeys[currentKey] ?? 0) + 1;
  }

  saveStats();
}
