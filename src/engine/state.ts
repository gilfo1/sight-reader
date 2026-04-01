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
  troubleNotes: Record<string, number>;
  troubleOctaves: Record<string, number>;
  troubleKeys: Record<string, number>;
}

export const stats: AppStats = {
  notesPlayed: 0,
  correctNotes: 0,
  wrongNotes: 0,
  currentStreak: 0,
  maxStreak: 0,
  troubleNotes: {},
  troubleOctaves: {},
  troubleKeys: {},
};

export function resetStats(): void {
  stats.notesPlayed = 0;
  stats.correctNotes = 0;
  stats.wrongNotes = 0;
  stats.currentStreak = 0;
  stats.maxStreak = 0;
  stats.troubleNotes = {};
  stats.troubleOctaves = {};
  stats.troubleKeys = {};
}

export function recordCorrectNote(noteIdentifier: string, keySignature: string): void {
  stats.notesPlayed++;
  stats.correctNotes++;
  stats.currentStreak++;
  if (stats.currentStreak > stats.maxStreak) {
    stats.maxStreak = stats.currentStreak;
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
}

export function recordWrongNote(targetPitches: string[], keySignature: string): void {
  stats.notesPlayed++;
  stats.wrongNotes++;
  stats.currentStreak = 0;
  
  let keyIncremented = false;
  targetPitches.forEach(p => {
    stats.troubleNotes[p] = (stats.troubleNotes[p] || 0) + 1;
    const match = p.match(/\d+/);
    if (match) {
      const octave = match[0]!;
      stats.troubleOctaves[octave] = (stats.troubleOctaves[octave] || 0) + 1;
      if (!keyIncremented) {
        stats.troubleKeys[keySignature] = (stats.troubleKeys[keySignature] || 0) + 1;
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
