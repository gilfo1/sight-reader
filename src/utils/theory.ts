import { ENHARMONIC_MAP, SHARP_KEYS, FLAT_KEYS } from '../constants/music';

export function getNoteValue(note: string): number {
  const match: RegExpMatchArray | null = note.match(/^([A-G][#b]*)(-?\d+)$/);
  if (!match) return NaN;
  const name: string = match[1]!;
  const octave: number = parseInt(match[2]!);
  
  const baseOffsets: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };
  
  const base: string = name[0]!;
  let val: number = baseOffsets[base]!;
  
  // Handle accidentals
  for (let i = 1; i < name.length; i++) {
    if (name[i] === '#') val++;
    else if (name[i] === 'b') val--;
  }
  
  return (octave + 1) * 12 + val;
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
