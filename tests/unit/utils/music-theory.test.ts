import { describe, it, expect } from 'vitest';
import { getNoteValue, isNoteInKey } from '../../../src/utils/music-theory';
import { SCALES } from '../../../src/constants/music';

describe('Music Theory Utilities', () => {
  it('should return correct note values', () => {
    expect(getNoteValue('C4')).toBe(60);
    expect(getNoteValue('A4')).toBe(69);
    expect(getNoteValue('C#4')).toBe(61);
    expect(getNoteValue('Db4')).toBe(61);
    expect(getNoteValue('A0')).toBe(21);
    expect(getNoteValue('C8')).toBe(108);
  });

  it('should handle enharmonics in getNoteValue', () => {
    expect(getNoteValue('B#3')).toBe(getNoteValue('C4'));
    expect(getNoteValue('Cb4')).toBe(getNoteValue('B3'));
  });

  it('should correctly identify notes in key', () => {
    expect(isNoteInKey('C', 'C', SCALES)).toBe(true);
    expect(isNoteInKey('C#', 'C', SCALES)).toBe(false);
    expect(isNoteInKey('F#', 'G', SCALES)).toBe(true);
    expect(isNoteInKey('Bb', 'F', SCALES)).toBe(true);
  });
});
