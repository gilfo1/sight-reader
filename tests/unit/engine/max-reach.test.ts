import { describe, it, expect } from 'vitest';
import { getRandomPitches, generateScoreData } from '@/engine/music-generator';
import { getNoteValue } from '@/utils/theory';

describe('Max Hand Reach Engine Logic', () => {
  describe('getRandomPitches Reach', () => {
    it('should respect maxReach of 5 semitones (Major Third)', () => {
      for (let i = 0; i < 50; i++) {
        const pitches = getRandomPitches('treble', 2, 'C4', 'C6', 'C', false, false, 5);
        if (pitches.length < 2) continue;
        const v1 = getNoteValue(pitches[0]);
        const v2 = getNoteValue(pitches[1]);
        expect(Math.abs(v1 - v2)).toBeLessThan(5);
      }
    });

    it('should respect maxReach of 12 semitones (Octave)', () => {
      for (let i = 0; i < 50; i++) {
        const pitches = getRandomPitches('treble', 4, 'C4', 'C6', 'C', false, false, 12);
        if (pitches.length < 2) continue;
        const vals = pitches.map(getNoteValue);
        expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(12);
      }
    });

    it('should handle empty pools gracefully', () => {
      const pitches = getRandomPitches('treble', 10, 'C4', 'C4', 'C', false, false, 1);
      expect(pitches.length).toBeLessThanOrEqual(1);
    });
  });

  describe('generateScoreData Advanced Reach', () => {
    it('should enforce reach across all beats in a measure', () => {
      const config = {
        measuresPerLine: 1,
        linesCount: 1,
        staffType: 'treble' as const,
        notesPerStep: 1,
        minNote: 'C4',
        maxNote: 'C6',
        maxReach: 5,
        selectedNoteValues: ['q'],
        selectedKeySignatures: ['C'],
        isChromatic: true,
        isAdaptive: false
      };

      for (let i = 0; i < 50; i++) {
        const data = generateScoreData(config);
        const vals = data[0].trebleSteps.flat().map(getNoteValue);
        if (vals.length < 2) continue;
        expect(Math.max(...vals) - Math.min(...vals)).toBeLessThan(5);
      }
    });

    it('should allow independence between hands in grand staff', () => {
      const config = {
        measuresPerLine: 1,
        linesCount: 1,
        staffType: 'grand' as const,
        notesPerStep: 1,
        minNote: 'C2',
        maxNote: 'C6',
        maxReach: 5,
        selectedNoteValues: ['q'],
        selectedKeySignatures: ['C'],
        isChromatic: true,
        isAdaptive: false
      };

      const data = generateScoreData(config);
      const trebleVals = data[0].trebleSteps.flat().map(getNoteValue);
      const bassVals = data[0].bassSteps.flat().map(getNoteValue);
      
      if (trebleVals.length > 1) expect(Math.max(...trebleVals) - Math.min(...trebleVals)).toBeLessThan(5);
      if (bassVals.length > 1) expect(Math.max(...bassVals) - Math.min(...bassVals)).toBeLessThan(5);
    });

    it('should enforce reach across measure boundaries', () => {
      const config = {
        measuresPerLine: 2,
        linesCount: 1,
        staffType: 'treble' as const,
        notesPerStep: 1,
        minNote: 'C3',
        maxNote: 'C6',
        maxReach: 5,
        selectedNoteValues: ['q'],
        selectedKeySignatures: ['C'],
        isChromatic: true,
        isAdaptive: false
      };

      for (let i = 0; i < 50; i++) {
        const data = generateScoreData(config);
        const m1Last = data[0].trebleSteps.flat().slice(-1)[0];
        const m2First = data[1].trebleSteps.flat()[0];
        
        if (m1Last && m2First) {
          expect(Math.abs(getNoteValue(m1Last) - getNoteValue(m2First))).toBeLessThan(5);
        }
      }
    });
  });
});
