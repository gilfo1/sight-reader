import { SCALES } from '@/constants/music';
import { getNoteValue } from '@/utils/theory';

// Global state for music data and progress
export interface Measure {
  trebleSteps: string[][];
  bassSteps: string[][];
  pattern: string[];
  keySignature: string;
  staffType: string;
}

export const musicData: Measure[] = [];
export let currentStepIndex: number = 0;
export const activeMidiNotes: Set<string> = new Set();
export const suppressedNotes: Set<string> = new Set();

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
  slowNoteTimes: Record<string, number[]>; // Track recent times for each note
  wrongOctaveNotes: Record<string, number>; // Specific notes missed by octave
  keySignatureMissedNotes: Record<string, number>; // Specific notes missed by key sig
}

export const stats: AppStats = {
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

export function resetStats(): void {
  stats.notesPlayed = 0;
  stats.correctNotes = 0;
  stats.wrongNotes = 0;
  stats.currentStreak = 0;
  stats.maxStreak = 0;
  stats.wrongOctaveCount = 0;
  stats.keySignatureNotHonoredCount = 0;
  stats.totalCorrectNoteTime = 0;
  stats.averageCorrectNoteTime = 0;
  stats.troubleNotes = {};
  stats.troubleOctaves = {};
  stats.troubleKeys = {};
  stats.slowNoteTimes = {};
  stats.wrongOctaveNotes = {};
  stats.keySignatureMissedNotes = {};
}

export function recordCorrectNote(noteIdentifier: string, keySignature: string, timeMs?: number): void {
  stats.notesPlayed++;
  stats.correctNotes++;
  stats.currentStreak++;
  if (stats.currentStreak > stats.maxStreak) {
    stats.maxStreak = stats.currentStreak;
  }

  if (timeMs !== undefined) {
    stats.totalCorrectNoteTime += timeMs;
    stats.averageCorrectNoteTime = stats.totalCorrectNoteTime / stats.correctNotes;
    
    // Store recent times for slow note detection
    if (!stats.slowNoteTimes[noteIdentifier]) {
      stats.slowNoteTimes[noteIdentifier] = [];
    }
    stats.slowNoteTimes[noteIdentifier]!.push(timeMs);
    // Keep only last 10 times per note for moving average/recent trend
    if (stats.slowNoteTimes[noteIdentifier]!.length > 10) {
      stats.slowNoteTimes[noteIdentifier]!.shift();
    }
  }

  if ((stats.troubleNotes[noteIdentifier] || 0) > 0) {
    stats.troubleNotes[noteIdentifier]!--;
  }
  const match = noteIdentifier.match(/\d+/);
  if (match) {
    const octave = match[0]!;
    if ((stats.troubleOctaves[octave] || 0) > 0) {
      stats.troubleOctaves[octave]!--;
    }
  }
  if ((stats.troubleKeys[keySignature] || 0) > 0) {
    stats.troubleKeys[keySignature]!--;
  }
  if ((stats.wrongOctaveNotes[noteIdentifier] || 0) > 0) {
    stats.wrongOctaveNotes[noteIdentifier]!--;
  }
  if ((stats.keySignatureMissedNotes[noteIdentifier] || 0) > 0) {
    stats.keySignatureMissedNotes[noteIdentifier]!--;
  }
}

export function recordWrongNote(playedNote: string, targetPitches: string[], currentKey: string): void {
  stats.notesPlayed++;
  stats.wrongNotes++;
  stats.currentStreak = 0;

  // Error detection
  const playedValue = getNoteValue(playedNote);
  const playedName = playedNote.replace(/\d+/, '');
  const playedOctave = playedNote.match(/\d+/) ? playedNote.match(/\d+/)![0] : '';

  let isWrongOctave = false;
  let isKeySignatureNotHonored = false;

  for (const target of targetPitches) {
    const targetValue = getNoteValue(target);
    const targetName = target.replace(/\d+/, '');
    const targetOctave = target.match(/\d+/) ? target.match(/\d+/)![0] : '';

    // 1. Correct note, wrong octave
    if (playedName === targetName && playedOctave !== targetOctave) {
      isWrongOctave = true;
    }

    // 2. Correct note, key signature not honored
    // This happens if the user played the natural version of a note that should be sharpened/flattened by key sig,
    // OR vice versa.
    // If they played C4 but it should be C#4.
    if (playedName.charAt(0) === targetName.charAt(0) && playedName !== targetName) {
      if (playedOctave === targetOctave) {
        isKeySignatureNotHonored = true;
      } else {
        // If they played the wrong accidental AND the wrong octave, we count BOTH.
        isKeySignatureNotHonored = true;
        isWrongOctave = true;
      }
    }
  }

  if (isWrongOctave) {
    stats.wrongOctaveCount++;
    targetPitches.forEach(p => {
      stats.wrongOctaveNotes[p] = (stats.wrongOctaveNotes[p] || 0) + 1;
    });
  }
  if (isKeySignatureNotHonored) {
    stats.keySignatureNotHonoredCount++;
    targetPitches.forEach(p => {
      stats.keySignatureMissedNotes[p] = (stats.keySignatureMissedNotes[p] || 0) + 1;
    });
  }

  let keyIncremented = false;
  targetPitches.forEach(p => {
    stats.troubleNotes[p] = (stats.troubleNotes[p] || 0) + 1;
    const match = p.match(/\d+/);
    if (match) {
      const octave = match[0]!;
      stats.troubleOctaves[octave] = (stats.troubleOctaves[octave] || 0) + 1;
      if (!keyIncremented) {
        stats.troubleKeys[currentKey] = (stats.troubleKeys[currentKey] || 0) + 1;
        keyIncremented = true;
      }
    }
  });
}

export function setMusicData(data: Measure[]): void {
  musicData.length = 0;
  musicData.push(...data);
}

export function setCurrentStepIndex(index: number): void {
  currentStepIndex = index;
}

export function resetGameState(): void {
  currentStepIndex = 0;
  suppressedNotes.clear();
  activeMidiNotes.clear();
  musicData.length = 0;
}

/**
 * Gets the measure and step index for a global step index.
 * @param index 
 * @returns {{measureIdx: number, stepIdx: number} | null}
 */
export function getStepInfo(index: number): { measureIdx: number; stepIdx: number } | null {
  if (index < 0) return null;
  let count = 0;
  for (let m = 0; m < musicData.length; m++) {
    const measure = musicData[m];
    if (!measure) continue;
    const stepsInMeasure = (measure.pattern || []).length;
    if (index < count + stepsInMeasure) {
      return { measureIdx: m, stepIdx: index - count };
    }
    count += stepsInMeasure;
  }
  return null;
}

export function getTargetNotesAtStep(index: number): string[] {
  const info = getStepInfo(index);
  if (!info) return [];
  const measure = musicData[info.measureIdx]!;
  return Array.from(new Set([
    ...(measure.trebleSteps[info.stepIdx] || []),
    ...(measure.bassSteps[info.stepIdx] || [])
  ]));
}

/**
 * Gets the total number of steps in the music data.
 * @returns {number}
 */
export function getTotalSteps(): number {
  return musicData.reduce((acc, m) => acc + (m.pattern?.length || 0), 0);
}
