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
    // Current implementation might return NaN or error depending on how it's written
    // Let's check theory.ts
    expect(getNoteValue('invalid')).toBeNaN();
    expect(getNoteValue('Z4')).toBeNaN();
  });
});
