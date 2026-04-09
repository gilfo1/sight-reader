import { describe, it, expect } from 'vitest';
import { generateScoreData, GeneratorConfig } from '@/engine/music-generator';
import { getNoteValue } from '@/utils/theory';

describe('Music Generator Bug Reproduction', () => {
  it('should not have notes in the wrong staff when notesPerStep is 1 and staffType is grand', () => {
    // Try all possible min/max combinations in a reasonable range
    const allNotes = ['C2', 'G2', 'C3', 'G3', 'C4', 'G4', 'C5', 'G5', 'C6'];
    
    for (let i = 0; i < allNotes.length; i++) {
      for (let j = i + 1; j < allNotes.length; j++) {
        const config: GeneratorConfig = {
          measuresPerLine: 2,
          linesCount: 1,
          staffType: 'grand',
          notesPerStep: 1,
          minNote: allNotes[i],
          maxNote: allNotes[j],
          selectedNoteValues: ['q'],
          selectedKeySignatures: ['C'],
          isChromatic: false,
          isAdaptive: false,
          maxReach: 12
        };

        const data = generateScoreData(config);
        
        data.forEach((measure) => {
          measure.trebleSteps.forEach((step, sIdx) => {
            const bassStep = measure.bassSteps[sIdx];
            
            if (step.length > 0) {
              expect(bassStep.length, `Step ${sIdx} has notes in both staffs! Min: ${config.minNote}, Max: ${config.maxNote}`).toBe(0);
              step.forEach(note => {
                const val = getNoteValue(note);
                expect(val, `Note ${note} in treble staff is too low! Min: ${config.minNote}, Max: ${config.maxNote}`).toBeGreaterThanOrEqual(getNoteValue('C4'));
              });
            }
            
            if (bassStep.length > 0) {
              expect(step.length, `Step ${sIdx} has notes in both staffs! Min: ${config.minNote}, Max: ${config.maxNote}`).toBe(0);
              bassStep.forEach(note => {
                const val = getNoteValue(note);
                expect(val, `Note ${note} in bass staff is too high! Min: ${config.minNote}, Max: ${config.maxNote}`).toBeLessThan(getNoteValue('C4'));
              });
            }
          });
        });
      }
    }
  });

  it('should have exactly one note per step when possible', () => {
    const config: GeneratorConfig = {
      measuresPerLine: 4,
      linesCount: 1,
      staffType: 'grand',
      notesPerStep: 1,
      minNote: 'A2',
      maxNote: 'C6',
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C'],
      isChromatic: false,
      isAdaptive: false,
      maxReach: 12
    };

    const data = generateScoreData(config);
    data.forEach(measure => {
      measure.trebleSteps.forEach((step, b) => {
        const bassStep = measure.bassSteps[b];
        expect(step.length + bassStep.length).toBe(1);
      });
    });
  });

  it('should switch to available staff when one staff has no notes in range', () => {
    // Range only in Treble (C4 to C5)
    const config: GeneratorConfig = {
      measuresPerLine: 4,
      linesCount: 1,
      staffType: 'grand',
      notesPerStep: 1,
      minNote: 'C4',
      maxNote: 'C5',
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C'],
      isChromatic: false,
      isAdaptive: false,
      maxReach: 12
    };

    const data = generateScoreData(config);
    data.forEach(measure => {
      measure.trebleSteps.forEach((step, b) => {
        const bassStep = measure.bassSteps[b];
        // Even when it's bass's "turn", it should have switched to treble because bass is empty.
        expect(step.length).toBe(1);
        expect(bassStep.length).toBe(0);
      });
    });

    // Range only in Bass (C2 to B3)
    config.minNote = 'C2';
    config.maxNote = 'B3';
    const data2 = generateScoreData(config);
    data2.forEach(measure => {
      measure.trebleSteps.forEach((step, b) => {
        const bassStep = measure.bassSteps[b];
        expect(step.length).toBe(0);
        expect(bassStep.length).toBe(1);
      });
    });
  });
});
