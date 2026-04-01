import { describe, it, expect } from 'vitest';
import { generateScoreData } from '@/engine/music-generator';

describe('Key Signature Selection Regression', () => {
  it('should only choose key signatures that are checked off', () => {
    const config = {
      measuresPerLine: 4,
      linesCount: 20,
      staffType: 'grand',
      notesPerStep: 1,
      minNote: 'C2',
      maxNote: 'C6',
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C', 'Bb', 'Chromatic'],
      isChromatic: true,
      maxReach: 12,
      isAdaptive: false
    };

    const data = generateScoreData(config);
    const allowedKeys = ['C', 'Bb'];
    
    data.forEach(measure => {
      expect(allowedKeys).toContain(measure.keySignature);
    });
  });

  it('should NEVER choose B if only C and Bb are selected (1000 trials)', () => {
    const config = {
      measuresPerLine: 4,
      linesCount: 25, // 100 measures total
      staffType: 'grand',
      notesPerStep: 1,
      minNote: 'C2',
      maxNote: 'C6',
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C', 'Bb', 'Chromatic'],
      isChromatic: true,
      maxReach: 12,
      isAdaptive: false
    };

    for (let i = 0; i < 10; i++) { // 10 trials * 100 measures = 1000 checks
      const data = generateScoreData(config);
      data.forEach(measure => {
        expect(['C', 'Bb']).toContain(measure.keySignature);
        expect(measure.keySignature).not.toBe('B');
      });
    }
  });
});
