import { describe, it, expect, beforeEach } from 'vitest';
import { setMusicData, resetGameState, getStepInfo, getTotalSteps, currentStepIndex, setCurrentStepIndex } from '../../../src/engine/state';

describe('App State Engine', () => {
  beforeEach(() => {
    resetGameState();
  });

  it('should initialize with default state', () => {
    expect(currentStepIndex).toBe(0);
    expect(getTotalSteps()).toBe(0);
  });

  it('should allow setting and getting current step index', () => {
    setCurrentStepIndex(5);
    expect(currentStepIndex).toBe(5);
  });

  it('should reset game state correctly', () => {
    setCurrentStepIndex(10);
    resetGameState();
    expect(currentStepIndex).toBe(0);
  });

  describe('Step and Progress Mapping', () => {
    beforeEach(() => {
      setMusicData([
        { pattern: ['q', 'q', 'q', 'q'], trebleSteps: [], bassSteps: [], staffType: 'grand', keySignature: 'C' }, // 4 steps
        { pattern: ['h', 'h'], trebleSteps: [], bassSteps: [], staffType: 'grand', keySignature: 'C' },          // 2 steps
        { pattern: ['8', '8', '8', '8', 'q', 'q'], trebleSteps: [], bassSteps: [], staffType: 'grand', keySignature: 'C' } // 6 steps
      ]);
    });

    it('getTotalSteps should correctly sum all patterns', () => {
      expect(getTotalSteps()).toBe(12);
    });

    it('getStepInfo should return correct measure and step indices', () => {
      // Measure 0
      expect(getStepInfo(0)).toEqual({ measureIdx: 0, stepIdx: 0 });
      expect(getStepInfo(3)).toEqual({ measureIdx: 0, stepIdx: 3 });
      
      // Measure 1
      expect(getStepInfo(4)).toEqual({ measureIdx: 1, stepIdx: 0 });
      expect(getStepInfo(5)).toEqual({ measureIdx: 1, stepIdx: 1 });
      
      // Measure 2
      expect(getStepInfo(6)).toEqual({ measureIdx: 2, stepIdx: 0 });
      expect(getStepInfo(11)).toEqual({ measureIdx: 2, stepIdx: 5 });
    });

    it('getStepInfo should return null for out-of-bounds indices', () => {
      expect(getStepInfo(12)).toBeNull();
      expect(getStepInfo(-1)).toBeNull();
    });
  });
});
