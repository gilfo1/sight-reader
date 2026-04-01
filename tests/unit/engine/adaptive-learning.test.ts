import { describe, it, expect, beforeEach } from 'vitest';
import { getRandomPitches, generateScoreData, GeneratorConfig } from '../../../src/engine/music-generator';
import { stats, resetStats } from '../../../src/engine/state';

describe('Adaptive Learning Music Generation', () => {
  beforeEach(() => {
    resetStats();
  });

  describe('getRandomPitches (Notes and Octaves)', () => {
    it('should favor trouble notes when adaptive learning is enabled', () => {
      // Set trouble note C4
      stats.troubleNotes['C4'] = 100;
      
      const config = {
        minNote: 'C4',
        maxNote: 'G4',
        keySignature: 'C',
        isChromatic: false,
        isAdaptive: true
      };

      // Run multiple times to check bias
      let c4Count = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, config.minNote, config.maxNote, config.keySignature, config.isChromatic, config.isAdaptive);
        if (pitches.includes('C4')) c4Count++;
      }

      // Without bias, C4 would be ~1/5 (C,D,E,F,G). With 100 errors, it should be much higher.
      // Weight of C4 = 1 + 100*3 + (octave 4 weight) = 301.
      // Weights of others = 1.
      // Total weight = 301 + 1 + 1 + 1 + 1 = 305.
      // Prob(C4) = 301/305 ~= 98%.
      expect(c4Count).toBeGreaterThan(90);
    });

    it('should favor trouble octaves when adaptive learning is enabled', () => {
      // Set trouble octave 5
      stats.troubleOctaves['5'] = 100;
      
      const config = {
        minNote: 'C4',
        maxNote: 'C6',
        keySignature: 'C',
        isChromatic: false,
        isAdaptive: true
      };

      let octave5Count = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, config.minNote, config.maxNote, config.keySignature, config.isChromatic, config.isAdaptive);
        if (pitches[0]?.includes('5')) octave5Count++;
      }

      // Treble range C4-C6 has octaves 4, 5, 6.
      // Octave 5 notes: C5, D5, E5, F5, G5, A5, B5 (7 notes).
      // Octave 4 notes: C4...B4 (12 notes, but treble starts at C4).
      // All notes in octave 5 get weight 101.
      // Notes in other octaves get weight 1.
      expect(octave5Count).toBeGreaterThan(80);
    });

    it('should not favor notes when adaptive learning is disabled', () => {
      stats.troubleNotes['C4'] = 1000;
      
      const config = {
        minNote: 'C4',
        maxNote: 'G4',
        keySignature: 'C',
        isChromatic: false,
        isAdaptive: false
      };

      let c4Count = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, config.minNote, config.maxNote, config.keySignature, config.isChromatic, config.isAdaptive);
        if (pitches.includes('C4')) c4Count++;
      }

      // Prob(C4) should be ~1/5 = 20%. 
      expect(c4Count).toBeLessThan(40); 
    });
  });

  describe('generateScoreData (Key Signatures)', () => {
    it('should favor trouble key signatures when adaptive learning is enabled', () => {
      stats.troubleKeys['G'] = 100;
      
      const config: GeneratorConfig = {
        measuresPerLine: 1,
        linesCount: 20,
        staffType: 'treble',
        notesPerStep: 1,
        minNote: 'C4',
        maxNote: 'C5',
        selectedNoteValues: ['q'],
        selectedKeySignatures: ['C', 'G', 'F'],
        isChromatic: false,
        isAdaptive: true
      };

      const data = generateScoreData(config);
      const gCount = data.filter(m => m.keySignature === 'G').length;

      // Total weight = (1 + 100*5) for G, plus (1) for C, plus (1) for F = 503.
      // Prob(G) = 501/503 ~= 99%.
      expect(gCount).toBeGreaterThan(15);
    });
  });
});
