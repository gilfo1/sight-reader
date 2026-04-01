import { DURATION_WEIGHTS, ALL_PIANO_NOTES, SCALES, ENHARMONIC_MAP, KEY_SIGNATURES } from '@/constants/music';
import { getNoteValue, getEnharmonic } from '@/utils/theory';
import { Measure, stats } from './state';
import { weightedRandom } from '@/utils/random';

export function generateRhythmicPattern(selectedDurations: string[]): string[] {
  const pattern: string[] = [];
  let remaining: number = 16;
  const allDurations: string[] = ['w', 'h', 'q', '8', '16'];
  
  while (remaining > 0) {
    const options: string[] = selectedDurations.filter((d: string): boolean => (DURATION_WEIGHTS[d] || 0) <= remaining);
    let chosen: string;
    if (options.length > 0) {
      chosen = options[Math.floor(Math.random() * options.length)]!;
    } else {
      const fallbackOptions: string[] = allDurations.filter((d: string): boolean => (DURATION_WEIGHTS[d] || 0) <= remaining);
      chosen = fallbackOptions[0]!;
    }
    pattern.push(chosen);
    remaining -= (DURATION_WEIGHTS[chosen] || 0);
  }
  return pattern;
}

export function getRandomPitches(clef: string, count: number, minNote: string, maxNote: string, keySignature: string, isChromatic: boolean, isAdaptive: boolean = false, maxReach: number = 12): string[] {
  const minVal: number = getNoteValue(minNote);
  const maxVal: number = getNoteValue(maxNote);
  const midC: number = getNoteValue('C4');
  
  const validNotes: string[] = ALL_PIANO_NOTES.filter((n: string): boolean => {
    const v: number = getNoteValue(n);
    if (v < minVal || v > maxVal) return false;
    return clef === 'bass' ? v < midC : v >= midC;
  });

  if (validNotes.length === 0) return [];

  const scale: string[] = SCALES[keySignature] || SCALES['C']!;
  let pool: string[] = isChromatic ? validNotes : validNotes.filter((n: string): boolean => {
    const match: RegExpMatchArray | null = n.match(/^[A-G][#b]*/);
    const name: string = match ? match[0] : '';
    return scale.includes(name) || (!!ENHARMONIC_MAP[name] && scale.includes(ENHARMONIC_MAP[name]!));
  });
  if (pool.length === 0) pool = validNotes;

  const tempPool = [...pool];
  const selected: string[] = [];

  for (let i = 0; i < Math.min(count, pool.length); i++) {
    let currentPool = tempPool;
    if (selected.length > 0) {
      const minS = Math.min(...selected.map(getNoteValue));
      const maxS = Math.max(...selected.map(getNoteValue));
      const reachLimit = maxReach;
      
      currentPool = tempPool.filter(n => {
        const v = getNoteValue(n);
        const newMin = Math.min(minS, v);
        const newMax = Math.max(maxS, v);
        return (newMax - newMin) <= reachLimit;
      });
    }

    if (currentPool.length === 0) break;

    let note: string;
    if (isAdaptive) {
      const weights = currentPool.map(n => {
        const noteWeight = (stats.troubleNotes[n] || 0) * 3;
        const octMatch = n.match(/\d+/);
        const octWeight = octMatch ? (stats.troubleOctaves[octMatch[0]] || 0) : 0;
        return 1 + noteWeight + octWeight;
      });
      note = weightedRandom(currentPool, weights);
    } else {
      note = currentPool[Math.floor(Math.random() * currentPool.length)]!;
    }
    const tempIdx = tempPool.indexOf(note);
    if (tempIdx > -1) tempPool.splice(tempIdx, 1);
    
    selected.push(getEnharmonic(note, keySignature, isChromatic));
  }
  
  return selected.sort((a, b) => getNoteValue(a) - getNoteValue(b));
}

export function computeMeasureCounts(staffType: string, notesPerStep: number, measureIdx: number = 0, pattern: string[] = ['q', 'q', 'q', 'q']): { trebleCounts: number[]; bassCounts: number[] } {
  const getCounts = (isTreble: boolean): number[] => pattern.map((_, b: number) => {
    if (staffType === (isTreble ? 'bass' : 'treble')) return 0;
    if (staffType !== 'grand') return notesPerStep;
    
    if (notesPerStep === 1) {
      const isTrebleTurn: boolean = (b + measureIdx) % 2 === 0;
      if (isTreble) return isTrebleTurn ? 1 : 0;
      return isTrebleTurn ? 0 : 1;
    }
    return isTreble ? Math.ceil(notesPerStep / 2) : Math.floor(notesPerStep / 2);
  });

  return { trebleCounts: getCounts(true), bassCounts: getCounts(false) };
}

export interface GeneratorConfig {
  measuresPerLine: number;
  linesCount: number;
  staffType: string;
  notesPerStep: number;
  minNote: string;
  maxNote: string;
  maxReach: number;
  selectedNoteValues: string[];
  selectedKeySignatures: string[];
  isChromatic: boolean;
  isAdaptive: boolean;
}

export function generateScoreData(config: GeneratorConfig): Measure[] {
  const {
    measuresPerLine,
    linesCount,
    staffType,
    notesPerStep,
    minNote,
    maxNote,
    maxReach,
    selectedNoteValues,
    selectedKeySignatures,
    isChromatic,
    isAdaptive
  } = config;

  const actualKeys = (selectedKeySignatures || []).filter(k => KEY_SIGNATURES.includes(k));
  const availableKeys = actualKeys.length > 0 ? actualKeys : ['C'];

  const data: Measure[] = [];
  for (let l = 0; l < linesCount; l++) {
    let lineKey: string;
    if (isAdaptive && availableKeys.length > 1) {
      const weights = availableKeys.map(k => 1 + (stats.troubleKeys[k] || 0) * 5);
      lineKey = weightedRandom(availableKeys, weights);
    } else {
      lineKey = availableKeys[Math.floor(Math.random() * availableKeys.length)]!;
    }

    for (let m = 0; m < measuresPerLine; m++) {
      const globalMeasureIdx = (l * measuresPerLine) + m;
      const pattern = generateRhythmicPattern(selectedNoteValues);
      const { trebleCounts, bassCounts } = computeMeasureCounts(staffType, notesPerStep, globalMeasureIdx, pattern);
      const trebleStepsInMeasure: string[][] = [];
      const bassStepsInMeasure: string[][] = [];

      for (let b = 0; b < pattern.length; b++) {
        let trebleCount = trebleCounts[b] || 0;
        let bassCount = bassCounts[b] || 0;

        if (staffType === 'grand' && notesPerStep === 1) {
          const trebleNotes = getRandomPitches('treble', 1, minNote, maxNote, lineKey, isChromatic, isAdaptive, maxReach);
          const bassNotes = getRandomPitches('bass', 1, minNote, maxNote, lineKey, isChromatic, isAdaptive, maxReach);

          if (trebleCount > 0 && trebleNotes.length === 0 && bassNotes.length > 0) {
            // Treble turn but no treble notes, and bass notes are available. Switch to bass.
            trebleStepsInMeasure.push([]);
            bassStepsInMeasure.push(bassNotes);
          } else if (bassCount > 0 && bassNotes.length === 0 && trebleNotes.length > 0) {
            // Bass turn but no bass notes, and treble notes are available. Switch to treble.
            trebleStepsInMeasure.push(trebleNotes);
            bassStepsInMeasure.push([]);
          } else {
            // Normal case or both empty or both available but we stick to original turn
            trebleStepsInMeasure.push(trebleCount > 0 ? trebleNotes : []);
            bassStepsInMeasure.push(bassCount > 0 ? bassNotes : []);
          }
        } else {
          trebleStepsInMeasure.push(trebleCount > 0 ? getRandomPitches('treble', trebleCount, minNote, maxNote, lineKey, isChromatic, isAdaptive, maxReach) : []);
          bassStepsInMeasure.push(bassCount > 0 ? getRandomPitches('bass', bassCount, minNote, maxNote, lineKey, isChromatic, isAdaptive, maxReach) : []);
        }
      }
      data.push({ trebleSteps: trebleStepsInMeasure, bassSteps: bassStepsInMeasure, pattern, staffType, keySignature: lineKey });
    }
  }
  return data;
}
