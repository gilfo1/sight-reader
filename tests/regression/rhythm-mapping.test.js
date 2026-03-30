import { describe, it, expect } from 'vitest';
import { generateRhythmicPattern, getStepInfo, getTotalSteps, setMusicData } from '../../src/main.js';

describe('Rhythm and Pattern Mapping Regression', () => {
  it('should generate valid 4/4 rhythmic patterns for various selections', () => {
    const selections = [['w'], ['h'], ['q'], ['8'], ['16'], ['h', 'q', '8']];
    selections.forEach(sel => {
      for (let i = 0; i < 20; i++) {
        const pattern = generateRhythmicPattern(sel);
        const sum = pattern.reduce((acc, d) => {
          const weights = { 'w': 16, 'h': 8, 'q': 4, '8': 2, '16': 1 };
          return acc + weights[d];
        }, 0);
        expect(sum).toBe(16);
      }
    });
  });

  it('should correctly map global steps to measure and beat info with variable rhythms', () => {
    setMusicData([
      { pattern: ['q', 'q', 'q', 'q'] }, // 4 steps
      { pattern: ['h', 'h'] },          // 2 steps
      { pattern: ['8', '8', '8', '8', 'q', 'q'] } // 6 steps
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
    setMusicData([{ pattern: ['q', 'q', 'q', 'q'] }]);
    expect(getStepInfo(4)).toBeNull();
    expect(getStepInfo(-1)).toBeNull();
  });
});
