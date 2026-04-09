import { beforeEach, describe, expect, it } from 'vitest';
import {
  getTargetNotesAtStep,
  resetGameState,
  setMusicData,
} from '@/engine/state';

describe('Session State Helpers', () => {
  beforeEach(() => {
    resetGameState();
  });

  it('returns unique target notes from both staves for a step', () => {
    setMusicData([
      {
        pattern: ['q'],
        trebleSteps: [['C4', 'E4']],
        bassSteps: [['C4', 'G3']],
        staffType: 'grand',
        keySignature: 'C',
      },
    ]);

    expect(getTargetNotesAtStep(0)).toEqual(['C4', 'E4', 'G3']);
  });

  it('returns an empty array for an out-of-range step', () => {
    setMusicData([
      {
        pattern: ['q'],
        trebleSteps: [['C4']],
        bassSteps: [[]],
        staffType: 'treble',
        keySignature: 'C',
      },
    ]);

    expect(getTargetNotesAtStep(10)).toEqual([]);
  });
});
