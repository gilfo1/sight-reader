import { DURATION_WEIGHTS, ALL_PIANO_NOTES, SCALES, ENHARMONIC_MAP, KEY_SIGNATURES } from '../constants/music';
import { getNoteValue, getEnharmonic } from '../utils/music-theory';
import { Measure } from './state';

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

export function getRandomPitches(clef: string, count: number, minNote: string, maxNote: string, _staffType: string, keySignature: string, isChromatic: boolean): string[] {
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
    return scale.includes(name) || (ENHARMONIC_MAP[name] && scale.includes(ENHARMONIC_MAP[name]!));
  });
  if (pool.length === 0) pool = validNotes;

  const tempPool = [...pool];
  const selected: string[] = [];
  const iterations = Math.min(count, tempPool.length);

  for (let i = 0; i < iterations; i++) {
    const idx = Math.floor(Math.random() * tempPool.length);
    const note = tempPool.splice(idx, 1)[0]!;
    selected.push(getEnharmonic(note, keySignature, isChromatic));
  }
  
  return selected.sort((a, b) => getNoteValue(a) - getNoteValue(b));
}

export function computeMeasureCounts(staffType: string, notesPerStep: number, measureIdx: number = 0, pattern: string[] = ['q', 'q', 'q', 'q']): { trebleCounts: number[]; bassCounts: number[] } {
  const getCounts = (isTreble: boolean): number[] => pattern.map((_, b: number) => {
    if (staffType === (isTreble ? 'bass' : 'treble')) return 0;
    if (staffType !== 'grand') return notesPerStep;
    
    if (notesPerStep === 1) {
      const isMyTurn: boolean = (b + measureIdx) % 2 === (isTreble ? 0 : 1);
      return isMyTurn ? 1 : 0;
    }
    return isTreble ? Math.ceil(notesPerStep / 2) : Math.floor(notesPerStep / 2);
  });

  return { trebleCounts: getCounts(true), bassCounts: getCounts(false) };
}

export interface AppConfig {
  measuresPerLine: number;
  linesCount: number;
  staffType: string;
  notesPerBeat: number;
  minNote: string;
  maxNote: string;
  selectedNoteValues: string[];
  selectedKeySignatures: string[];
  isChromatic: boolean;
}

export function generateMusicData(config: AppConfig): Measure[] {
  const {
    measuresPerLine,
    linesCount,
    staffType,
    notesPerBeat,
    minNote,
    maxNote,
    selectedNoteValues,
    selectedKeySignatures,
    isChromatic
  } = config;

  const actualKeys = (selectedKeySignatures || []).filter(k => KEY_SIGNATURES.includes(k));
  const availableKeys = actualKeys.length > 0 ? actualKeys : ['C'];

  const data: Measure[] = [];
  for (let l = 0; l < linesCount; l++) {
    const lineKey = availableKeys[Math.floor(Math.random() * availableKeys.length)]!;
    for (let m = 0; m < measuresPerLine; m++) {
      const globalMeasureIdx = (l * measuresPerLine) + m;
      const pattern = generateRhythmicPattern(selectedNoteValues);
      const { trebleCounts, bassCounts } = computeMeasureCounts(staffType, notesPerBeat, globalMeasureIdx, pattern);
      const trebleBeats: string[][] = [];
      const bassBeats: string[][] = [];

      for (let b = 0; b < pattern.length; b++) {
        trebleBeats.push((trebleCounts[b] || 0) > 0 ? getRandomPitches('treble', trebleCounts[b]!, minNote, maxNote, staffType, lineKey, isChromatic) : []);
        bassBeats.push((bassCounts[b] || 0) > 0 ? getRandomPitches('bass', bassCounts[b]!, minNote, maxNote, staffType, lineKey, isChromatic) : []);
      }
      data.push({ trebleBeats, bassBeats, pattern, staffType, keySignature: lineKey });
    }
  }
  return data;
}
