import { describe, it, expect } from 'vitest';
import { generateRhythmicPattern } from '../../src/engine/music-generator';
import { getStepInfo, getTotalSteps, setMusicData } from '../../src/engine/state';

describe('Rhythm and Pattern Mapping Regression', () => {
  it('should generate valid 4/4 rhythmic patterns for various selections', () => {
    const selections = [['w'], ['h'], ['q'], ['8'], ['16'], ['h', 'q', '8']];
    selections.forEach(sel => {
      for (let i = 0; i < 20; i++) {
        const pattern = generateRhythmicPattern(sel);
        const sum = pattern.reduce((acc, d) => {
          const weights: Record<string, number> = { 'w': 16, 'h': 8, 'q': 4, '8': 2, '16': 1 };
          return acc + (weights[d] || 0);
        }, 0);
        expect(sum).toBe(16);
      }
    });
  });

  it('should correctly map global steps to measure and step info with variable rhythms', () => {
    setMusicData([
      { pattern: ['q', 'q', 'q', 'q'], trebleSteps: [], bassSteps: [], staffType: 'grand', keySignature: 'C' }, // 4 steps
      { pattern: ['h', 'h'], trebleSteps: [], bassSteps: [], staffType: 'grand', keySignature: 'C' },          // 2 steps
      { pattern: ['8', '8', '8', '8', 'q', 'q'], trebleSteps: [], bassSteps: [], staffType: 'grand', keySignature: 'C' } // 6 steps
    ]);
    
    expect(getTotalSteps()).toBe(12);
    
    // Check various points
    expect(getStepInfo(0)).toEqual({ measureIdx: 0, stepIdx: 0 });
    expect(getStepInfo(3)).toEqual({ measureIdx: 0, stepIdx: 3 });
    expect(getStepInfo(4)).toEqual({ measureIdx: 1, stepIdx: 0 });
    expect(getStepInfo(5)).toEqual({ measureIdx: 1, stepIdx: 1 });
    expect(getStepInfo(6)).toEqual({ measureIdx: 2, stepIdx: 0 });
    expect(getStepInfo(11)).toEqual({ measureIdx: 2, stepIdx: 5 });
  });

  it('should return null for out-of-bounds mapping indices', () => {
    setMusicData([{ pattern: ['q', 'q', 'q', 'q'], trebleSteps: [], bassSteps: [], staffType: 'grand', keySignature: 'C' }]);
    expect(getStepInfo(4)).toBeNull();
    expect(getStepInfo(-1)).toBeNull();
  });
});
