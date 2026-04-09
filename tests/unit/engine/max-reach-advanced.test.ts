import { describe, it, expect } from 'vitest';
import { generateScoreData } from '../../../src/engine/music-generator';
import { getNoteValue } from '../../../src/utils/theory';

describe('Advanced Max Hand Reach (Across Measure)', () => {
  it('should enforce reach across all beats in a measure for each hand', () => {
    const config = {
      measuresPerLine: 1,
      linesCount: 1,
      staffType: 'treble',
      notesPerStep: 1, // 1 note per beat, 4 beats in a measure
      minNote: 'C4',
      maxNote: 'C6',
      maxReach: 5, // Max 4 semitones
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C'],
      isChromatic: true,
      isAdaptive: false
    };

    for (let i = 0; i < 50; i++) {
      const data = generateScoreData(config);
      const measure = data[0];
      const allPitches = measure.trebleSteps.flat();
      
      if (allPitches.length < 2) continue;
      
      const vals = allPitches.map(getNoteValue);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      
      expect(maxVal - minVal).toBeLessThan(5);
    }
  });

  it('should allow any distance between treble and bass in grand staff', () => {
    const config = {
      measuresPerLine: 1,
      linesCount: 1,
      staffType: 'grand',
      notesPerStep: 1,
      minNote: 'C2',
      maxNote: 'C6',
      maxReach: 5,
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C'],
      isChromatic: true,
      isAdaptive: false
    };

    for (let i = 0; i < 50; i++) {
      const data = generateScoreData(config);
      const measure = data[0];
      const treblePitches = measure.trebleSteps.flat();
      const bassPitches = measure.bassSteps.flat();
      
      if (treblePitches.length === 0 || bassPitches.length === 0) continue;
      
      const tVals = treblePitches.map(getNoteValue);
      const bVals = bassPitches.map(getNoteValue);
      
      const tMin = Math.min(...tVals);
      const tMax = Math.max(...tVals);
      const bMin = Math.min(...bVals);
      const bMax = Math.max(...bVals);
      
      // Each hand is within reach
      expect(tMax - tMin).toBeLessThan(5);
      expect(bMax - bMin).toBeLessThan(5);
    }
  });

  it('should work in bass clef only staff', () => {
      const config = {
          measuresPerLine: 1,
          linesCount: 1,
          staffType: 'bass',
          notesPerStep: 2,
          minNote: 'A0',
          maxNote: 'C4',
          maxReach: 7,
          selectedNoteValues: ['q'],
          selectedKeySignatures: ['C'],
          isChromatic: true,
          isAdaptive: false
      };

      for (let i = 0; i < 50; i++) {
          const data = generateScoreData(config);
          const measure = data[0];
          const allPitches = measure.bassSteps.flat();

          if (allPitches.length < 2) continue;

          const vals = allPitches.map(getNoteValue);
          const minVal = Math.min(...vals);
          const maxVal = Math.max(...vals);

          expect(maxVal - minVal).toBeLessThan(7);
      }
  });

  it('should enforce reach between the end of one measure and the start of the next', () => {
    const config = {
      measuresPerLine: 2,
      linesCount: 1,
      staffType: 'treble',
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
      expect(data.length).toBe(2);
      
      const m1 = data[0];
      const m2 = data[1];
      
      const m1LastNotes = m1.trebleSteps.filter(s => s.length > 0).pop() || [];
      const m2FirstNotes = m2.trebleSteps.find(s => s.length > 0) || [];
      
      if (m1LastNotes.length > 0 && m2FirstNotes.length > 0) {
        const lastVals = m1LastNotes.map(getNoteValue);
        const firstVals = m2FirstNotes.map(getNoteValue);
        
        const allVals = [...lastVals, ...firstVals];
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const span = maxVal - minVal;
        
        expect(span).toBeLessThan(5);
      }
    }
  });

  it('should enforce reach between the end of one line and the start of the next', () => {
    const config = {
      measuresPerLine: 1,
      linesCount: 2,
      staffType: 'treble',
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
      expect(data.length).toBe(2);
      
      const m1 = data[0];
      const m2 = data[1];
      
      const m1LastNotes = m1.trebleSteps.filter(s => s.length > 0).pop() || [];
      const m2FirstNotes = m2.trebleSteps.find(s => s.length > 0) || [];
      
      if (m1LastNotes.length > 0 && m2FirstNotes.length > 0) {
        const lastVals = m1LastNotes.map(getNoteValue);
        const firstVals = m2FirstNotes.map(getNoteValue);
        
        const allVals = [...lastVals, ...firstVals];
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const span = maxVal - minVal;
        
        expect(span).toBeLessThan(5);
      }
    }
  });
});
