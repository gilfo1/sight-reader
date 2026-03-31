import { ENHARMONIC_MAP, SHARP_KEYS, FLAT_KEYS } from '../constants/music';

export function getNoteValue(note: string): number {
  const match: RegExpMatchArray | null = note.match(/^([A-G][#b]*)(-?\d+)$/);
  if (!match) return -1;
  const name: string = match[1]!;
  const octave: number = parseInt(match[2]!);
  
  const offsets: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
    'B#': 0, 'Cb': 11, 'Fb': 4, 'E#': 5
  };
  
  let val: number = offsets[name]!;
  let octShift: number = 0;
  if (name === 'B#') octShift = 1;
  if (name === 'Cb') octShift = -1;
  
  return (octave + 1 + octShift) * 12 + val;
}

export function getEnharmonic(note: string, keySignature: string, isChromatic: boolean): string {
  const base: string = note.slice(0, 2);
  const oct: string = note.slice(2);
  const enh: string | undefined = ENHARMONIC_MAP[base];
  if (!enh) return note;

  const hasSharps: boolean = SHARP_KEYS.includes(keySignature);
  const hasFlats: boolean = FLAT_KEYS.includes(keySignature);

  if (isChromatic) {
    const r: number = Math.random();
    const useFlat: boolean = hasFlats ? r < 0.8 : (hasSharps ? r < 0.2 : r < 0.5);
    return useFlat ? enh + oct : note;
  }
  
  return hasFlats ? enh + oct : note;
}
