import { describe, it, expect, beforeEach } from 'vitest';
import { getRandomPitches, generateScoreData, GeneratorConfig } from '@/engine/music-generator';
import { stats, resetStats, recordCorrectNote } from '@/engine/state';

describe('Enhanced Adaptive Learning', () => {
  beforeEach(() => {
    resetStats();
  });

  describe('Key Signature Rotation', () => {
    it('should rotate key signatures even if one has many errors', () => {
      // Set a very high error count for 'G'
      stats.troubleKeys['G'] = 10000;
      
      const config: GeneratorConfig = {
        measuresPerLine: 1,
        linesCount: 20,
        staffType: 'treble',
        notesPerStep: 1,
        minNote: 'C4',
        maxNote: 'C5',
        selectedNoteValues: ['q'],
        selectedKeySignatures: ['C', 'G'],
        isChromatic: false,
        isAdaptive: true,
        maxReach: 12
      };

      const data = generateScoreData(config);
      const keys = data.map(m => m.keySignature);
      
      // Count unique keys in the first 5 measures (first 5 lines since measuresPerLine=1)
      const firstFiveKeys = new Set(keys.slice(0, 5));
      
      // Even with G having massive weight, the rotation penalty should eventually force C to appear
      // Weight of G = 50001
      // Weight of C = 1
      // After G appears once, G weight becomes 25000
      // After G appears 16 times, 50001 / 2^16 < 1. 
      // So within 20 lines, we definitely expect to see C at least once.
      expect(firstFiveKeys.has('C') || keys.includes('C')).toBe(true);
      
      // Check for streaks. It shouldn't be 20 'G's in a row.
      const hasC = keys.some(k => k === 'C');
      expect(hasC).toBe(true);
    });

    it('should not stick to one key indefinitely', () => {
      stats.troubleKeys['G'] = 1000;
      const config: GeneratorConfig = {
        measuresPerLine: 1,
        linesCount: 50,
        staffType: 'treble',
        notesPerStep: 1,
        minNote: 'C4',
        maxNote: 'C5',
        selectedNoteValues: ['q'],
        selectedKeySignatures: ['C', 'G', 'F'],
        isChromatic: false,
        isAdaptive: true,
        maxReach: 12
      };

      const data = generateScoreData(config);
      const keys = data.map(m => m.keySignature);
      
      const gCount = keys.filter(k => k === 'G').length;
      const otherCount = keys.filter(k => k !== 'G').length;
      
      expect(gCount).toBeGreaterThan(0);
      expect(otherCount).toBeGreaterThan(0);
    });
  });

  describe('Specific Error Weighting', () => {
    it('should favor notes that had octave errors', () => {
      // Note C4 has general trouble count 1
      stats.troubleNotes['C4'] = 1;
      // But it also has many octave errors
      stats.wrongOctaveNotes['C4'] = 10;
      
      // Note D4 has general trouble count 5
      stats.troubleNotes['D4'] = 5;
      
      // C4 weight: 1 + 1*3 + 10*5 = 54
      // D4 weight: 1 + 5*3 = 16
      
      const iterations = 100;
      let c4Count = 0;
      let d4Count = 0;
      
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, 'C4', 'D4', 'C', false, true);
        if (pitches.includes('C4')) c4Count++;
        if (pitches.includes('D4')) d4Count++;
      }
      
      expect(c4Count).toBeGreaterThan(d4Count);
    });

    it('should favor notes that had key signature errors', () => {
      // E4 has key sig errors
      stats.keySignatureMissedNotes['E4'] = 10;
      // F4 has general errors
      stats.troubleNotes['F4'] = 5;
      
      // E4 weight: 1 + 10*5 = 51
      // F4 weight: 1 + 5*3 = 16
      
      const iterations = 100;
      let e4Count = 0;
      let f4Count = 0;
      
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, 'E4', 'F4', 'C', false, true);
        if (pitches.includes('E4')) e4Count++;
        if (pitches.includes('F4')) f4Count++;
      }
      
      expect(e4Count).toBeGreaterThan(f4Count);
    });
  });

  describe('Slow Note Weighting', () => {
    it('should favor slow notes', () => {
      // Record some fast notes for G4
      for (let i = 0; i < 10; i++) {
        recordCorrectNote('G4', 'C', 100); 
      }
      // Record some slow notes for C4
      for (let i = 0; i < 10; i++) {
        recordCorrectNote('C4', 'C', 2000);
      }
      
      // Average time will be around (10*100 + 10*2000)/20 = 1050ms
      // C4 avg = 2000ms. Ratio = 2000/1050 ~= 1.9. Timing weight ~= 3.8.
      // G4 avg = 100ms. Ratio < 1. Timing weight = 0.
      
      const iterations = 100;
      let c4Count = 0;
      let g4Count = 0;
      
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, 'C4', 'G4', 'C', false, true);
        if (pitches.includes('C4')) c4Count++;
        if (pitches.includes('G4')) g4Count++;
      }
      
      expect(c4Count).toBeGreaterThan(g4Count);
    });
  });
});
