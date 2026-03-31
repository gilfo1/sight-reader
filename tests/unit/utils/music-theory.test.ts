import { describe, it, expect } from 'vitest';
import { getNoteValue } from '../../../src/utils/theory';

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
});
