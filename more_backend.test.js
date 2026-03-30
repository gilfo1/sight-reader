import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  generateRhythmicPattern, 
  getNoteValue, 
  isNoteInKey, 
  computeMeasureCounts,
  getStepInfo,
  musicData,
  setMusicData
} from './main.js';

describe('More Backend Tests', () => {
  describe('generateRhythmicPattern edge cases', () => {
    it('should handle only whole notes', () => {
      const pattern = generateRhythmicPattern(['w']);
      expect(pattern).toEqual(['w']);
    });

    it('should handle only sixteenth notes', () => {
      const pattern = generateRhythmicPattern(['16']);
      expect(pattern).toHaveLength(16);
      expect(pattern.every(d => d === '16')).toBe(true);
    });

    it('should fallback correctly if no selected duration fits', () => {
      // remaining starts at 16. If we only allow something > 16 (impossible with current weights, but let's see)
      // Actually DURATION_WEIGHTS has w=16 as max.
      // If we pass an empty array, it should use fallback.
      const pattern = generateRhythmicPattern([]);
      expect(pattern.length).toBeGreaterThan(0);
      const totalWeight = pattern.reduce((sum, d) => sum + {w:16, h:8, q:4, '8':2, '16':1}[d], 0);
      expect(totalWeight).toBe(16);
    });
  });

  describe('getNoteValue enhancements', () => {
    it('should correctly value enharmonics', () => {
      expect(getNoteValue('C#4')).toBe(getNoteValue('Db4'));
      expect(getNoteValue('D#4')).toBe(getNoteValue('Eb4'));
      expect(getNoteValue('F#4')).toBe(getNoteValue('Gb4'));
      expect(getNoteValue('G#4')).toBe(getNoteValue('Ab4'));
      expect(getNoteValue('A#4')).toBe(getNoteValue('Bb4'));
    });

    it('should handle B# and Cb correctly', () => {
      expect(getNoteValue('B#4')).toBe(getNoteValue('C5'));
      expect(getNoteValue('Cb4')).toBe(getNoteValue('B3'));
      expect(getNoteValue('E#4')).toBe(getNoteValue('F4'));
      expect(getNoteValue('Fb4')).toBe(getNoteValue('E4'));
    });
    
    it('should return -1 for invalid notes', () => {
        expect(getNoteValue('H4')).toBe(-1);
        expect(getNoteValue('')).toBe(-1);
        expect(getNoteValue('C')).toBe(-1);
    });
  });

  describe('isNoteInKey detail tests', () => {
    it('should work for all major keys', () => {
      expect(isNoteInKey('F#', 'G')).toBe(true);
      expect(isNoteInKey('F', 'G')).toBe(false);
      expect(isNoteInKey('Bb', 'F')).toBe(true);
      expect(isNoteInKey('B', 'F')).toBe(false);
      expect(isNoteInKey('C#', 'D')).toBe(true);
      expect(isNoteInKey('G#', 'A')).toBe(true);
      expect(isNoteInKey('D#', 'E')).toBe(true);
      expect(isNoteInKey('A#', 'B')).toBe(true);
      expect(isNoteInKey('E#', 'F#')).toBe(true);
      expect(isNoteInKey('B#', 'C#')).toBe(true);
    });
  });

  describe('getStepInfo robust testing', () => {
    beforeEach(() => {
      setMusicData([
        { pattern: ['q', 'q', 'q', 'q'] }, // 4 steps
        { pattern: ['h', 'h'] },           // 2 steps
        { pattern: ['w'] }                 // 1 step
      ]);
    });

    it('should return null for negative index', () => {
      expect(getStepInfo(-1)).toBeNull();
    });

    it('should return null for out of bounds index', () => {
      expect(getStepInfo(7)).toBeNull(); // Total steps is 4 + 2 + 1 = 7, so index 7 is out of bounds
    });

    it('should return correct info for each step', () => {
      expect(getStepInfo(0)).toEqual({ measureIdx: 0, stepIdx: 0 });
      expect(getStepInfo(3)).toEqual({ measureIdx: 0, stepIdx: 3 });
      expect(getStepInfo(4)).toEqual({ measureIdx: 1, stepIdx: 0 });
      expect(getStepInfo(5)).toEqual({ measureIdx: 1, stepIdx: 1 });
      expect(getStepInfo(6)).toEqual({ measureIdx: 2, stepIdx: 0 });
    });
  });

  describe('computeMeasureCounts detailed', () => {
    it('should distribute odd numbers of notes correctly on grand staff', () => {
      const { trebleCounts, bassCounts } = computeMeasureCounts('grand', 5, 0, ['q']);
      expect(trebleCounts[0]).toBe(3);
      expect(bassCounts[0]).toBe(2);
    });

    it('should distribute even numbers of notes correctly on grand staff', () => {
      const { trebleCounts, bassCounts } = computeMeasureCounts('grand', 4, 0, ['q']);
      expect(trebleCounts[0]).toBe(2);
      expect(bassCounts[0]).toBe(2);
    });

    it('should alternate correctly when notesPerStep is 1', () => {
      const res0 = computeMeasureCounts('grand', 1, 0, ['q', 'q']);
      expect(res0.trebleCounts).toEqual([1, 0]);
      expect(res0.bassCounts).toEqual([0, 1]);

      const res1 = computeMeasureCounts('grand', 1, 1, ['q', 'q']);
      expect(res1.trebleCounts).toEqual([0, 1]);
      expect(res1.bassCounts).toEqual([1, 0]);
    });
  });
});
