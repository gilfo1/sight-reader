import { describe, it, expect } from 'vitest';
import { getNoteValue, getEnharmonic } from '@/utils/theory';

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
    expect(getNoteValue('E#4')).toBe(getNoteValue('F4'));
    expect(getNoteValue('Fb4')).toBe(getNoteValue('E4'));
    expect(getNoteValue('F##4')).toBe(getNoteValue('G4'));
    expect(getNoteValue('Gbb4')).toBe(getNoteValue('F4'));
  });

  it('should handle octaves correctly', () => {
    expect(getNoteValue('C0')).toBe(12);
    expect(getNoteValue('C1')).toBe(24);
    expect(getNoteValue('C2')).toBe(36);
    expect(getNoteValue('C3')).toBe(48);
    expect(getNoteValue('C4')).toBe(60);
    expect(getNoteValue('C5')).toBe(72);
    expect(getNoteValue('C6')).toBe(84);
    expect(getNoteValue('C7')).toBe(96);
    expect(getNoteValue('C8')).toBe(108);
  });

  it('should return NaN for invalid notes', () => {
    expect(getNoteValue('invalid')).toBeNaN();
    expect(getNoteValue('Z4')).toBeNaN();
  });

  describe('getEnharmonic', () => {
    it('should return the same note if no enharmonic exists', () => {
      expect(getEnharmonic('C4', 'C', false)).toBe('C4');
      expect(getEnharmonic('E4', 'C', false)).toBe('E4');
    });

    it('should return flat enharmonic in flat keys', () => {
      expect(getEnharmonic('C#4', 'F', false)).toBe('Db4');
      expect(getEnharmonic('F#4', 'Bb', false)).toBe('Gb4');
    });

    it('should return original note in sharp keys', () => {
      expect(getEnharmonic('C#4', 'G', false)).toBe('C#4');
      expect(getEnharmonic('F#4', 'D', false)).toBe('F#4');
    });

    it('should handle chromatic mode with randomization', () => {
      // In F (flat key), should prefer flat 80% of the time
      let flats = 0;
      for (let i = 0; i < 100; i++) {
        if (getEnharmonic('C#4', 'F', true) === 'Db4') flats++;
      }
      expect(flats).toBeGreaterThan(50);

      // In G (sharp key), should prefer sharp (original) 80% of the time (flat 20%)
      let original = 0;
      for (let i = 0; i < 100; i++) {
        if (getEnharmonic('C#4', 'G', true) === 'C#4') original++;
      }
      expect(original).toBeGreaterThan(50);

      // Test C Major (neutral, 50/50)
      let cMajorFlats = 0;
      for (let i = 0; i < 1000; i++) {
        if (getEnharmonic('C#4', 'C', true) === 'Db4') cMajorFlats++;
      }
      expect(cMajorFlats).toBeGreaterThan(400);
      expect(cMajorFlats).toBeLessThan(600);
    });
  });
});
