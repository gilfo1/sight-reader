import { ALL_PIANO_NOTES, ENHARMONIC_MAP, KEY_SIGNATURES, SCALES } from '@/constants/music';
import { stats } from '@/engine/statistics-state';
import { weightedRandom } from '@/utils/random';
import { getEnharmonic, getNoteValue } from '@/utils/theory';

const MID_C = 'C4';

function getClefFilteredNotes(clef: string, minNote: string, maxNote: string): string[] {
  const minValue = getNoteValue(minNote);
  const maxValue = getNoteValue(maxNote);
  const middleCValue = getNoteValue(MID_C);

  return ALL_PIANO_NOTES.filter((note) => {
    const noteValue = getNoteValue(note);

    if (noteValue < minValue || noteValue > maxValue) {
      return false;
    }

    return clef === 'bass' ? noteValue < middleCValue : noteValue >= middleCValue;
  });
}

function getScaleFilteredNotes(validNotes: string[], keySignature: string, isChromatic: boolean): string[] {
  if (isChromatic) {
    return validNotes;
  }

  const scale = SCALES[keySignature] ?? SCALES.C!;

  const filteredNotes = validNotes.filter((note) => {
    const noteName = note.match(/^[A-G][#b]*/) ? note.match(/^[A-G][#b]*/)![0] : '';
    return scale.includes(noteName) || Boolean(ENHARMONIC_MAP[noteName] && scale.includes(ENHARMONIC_MAP[noteName]!));
  });

  return filteredNotes.length > 0 ? filteredNotes : validNotes;
}

function getTimingWeight(note: string): number {
  const noteTimes = stats.slowNoteTimes[note];

  if (!noteTimes || noteTimes.length === 0 || stats.averageCorrectNoteTime <= 0) {
    return 0;
  }

  const noteAverage = noteTimes.reduce((sum, time) => sum + time, 0) / noteTimes.length;

  if (noteAverage <= stats.averageCorrectNoteTime) {
    return 0;
  }

  return Math.min((noteAverage / stats.averageCorrectNoteTime) * 2, 10);
}

function getAdaptiveWeight(note: string): number {
  const octave = note.match(/\d+/)?.[0];
  const octaveWeight = octave ? (stats.troubleOctaves[octave] ?? 0) : 0;

  return 1
    + (stats.troubleNotes[note] ?? 0) * 3
    + (stats.wrongOctaveNotes[note] ?? 0) * 5
    + (stats.keySignatureMissedNotes[note] ?? 0) * 5
    + getTimingWeight(note)
    + octaveWeight;
}

function constrainByReach(pool: string[], consideredPitches: string[], maxReach: number): string[] {
  if (consideredPitches.length === 0) {
    return pool;
  }

  const existingValues = consideredPitches.map(getNoteValue);
  const minExistingValue = Math.min(...existingValues);
  const maxExistingValue = Math.max(...existingValues);

  return pool.filter((note) => {
    const noteValue = getNoteValue(note);
    const nextMin = Math.min(minExistingValue, noteValue);
    const nextMax = Math.max(maxExistingValue, noteValue);
    return (nextMax - nextMin) < maxReach;
  });
}

function selectNextPitch(pool: string[], isAdaptive: boolean): string {
  if (isAdaptive) {
    return weightedRandom(pool, pool.map(getAdaptiveWeight));
  }

  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function getRandomPitches(
  clef: string,
  count: number,
  minNote: string,
  maxNote: string,
  keySignature: string,
  isChromatic: boolean,
  isAdaptive = false,
  maxReach = 12,
  existingPitches: string[] = [],
): string[] {
  const validNotes = getClefFilteredNotes(clef, minNote, maxNote);

  if (validNotes.length === 0) {
    return [];
  }

  const normalizedKeySignature = KEY_SIGNATURES.includes(keySignature) ? keySignature : 'C';
  const candidatePool = [...getScaleFilteredNotes(validNotes, normalizedKeySignature, isChromatic)];
  const selectedPitches: string[] = [];
  const consideredPitches = [...existingPitches];

  for (let pitchIndex = 0; pitchIndex < Math.min(count, candidatePool.length); pitchIndex++) {
    const reachablePool = constrainByReach(candidatePool, consideredPitches, maxReach);

    if (reachablePool.length === 0) {
      break;
    }

    const selectedNote = selectNextPitch(reachablePool, isAdaptive);
    const normalizedPitch = getEnharmonic(selectedNote, normalizedKeySignature, isChromatic);
    candidatePool.splice(candidatePool.indexOf(selectedNote), 1);
    selectedPitches.push(normalizedPitch);
    consideredPitches.push(normalizedPitch);
  }

  return selectedPitches.sort((left, right) => getNoteValue(left) - getNoteValue(right));
}
