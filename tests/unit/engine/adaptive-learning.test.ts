import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRandomPitches, generateScoreData, GeneratorConfig } from '@/engine/music-generator';
import { stats, resetStats, recordCorrectNote, setMusicData, setCurrentStepIndex } from '@/engine/state';
import { initMidiHandler } from '@/engine/midi-handler';

// Mock WebMidi to avoid real MIDI initialization
vi.mock('webmidi', () => ({
  WebMidi: {
    enable: vi.fn().mockResolvedValue(undefined),
    inputs: [],
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

describe('Adaptive Learning Engine Logic', () => {
  beforeEach(() => {
    resetStats();
    // Set up DOM elements required by initMidiHandler
    document.body.innerHTML = `
      <div id="midi-device-name"></div>
      <div id="midi-indicator"></div>
      <div id="current-note"></div>
    `;
    initMidiHandler();
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
        isAdaptive: true,
        maxReach: 12
      };

      // Run multiple times to check bias
      let c4Count = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, config.minNote, config.maxNote, config.keySignature, config.isChromatic, config.isAdaptive, config.maxReach);
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
        isAdaptive: true,
        maxReach: 12
      };

      let octave5Count = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, config.minNote, config.maxNote, config.keySignature, config.isChromatic, config.isAdaptive, config.maxReach);
        if (pitches[0]?.includes('5')) octave5Count++;
      }

      // Treble range C4-C6 has octaves 4, 5, 6.
      // Octave 5 notes: C5, D5, E5, F5, G5, A5, B5 (7 notes).
      // Octave 4 notes: C4...B4 (12 notes, but treble starts at C4).
      // All notes in octave 5 get weight 101.
      // Notes in other octaves get weight 1.
      expect(octave5Count).toBeGreaterThan(60); 
    });

    it('should not favor notes when adaptive learning is disabled', () => {
      stats.troubleNotes['C4'] = 1000;
      
      const config = {
        minNote: 'C4',
        maxNote: 'G4',
        keySignature: 'C',
        isChromatic: false,
        isAdaptive: false,
        maxReach: 12
      };

      let c4Count = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const pitches = getRandomPitches('treble', 1, config.minNote, config.maxNote, config.keySignature, config.isChromatic, config.isAdaptive, config.maxReach);
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
        isAdaptive: true,
        maxReach: 12
      };

      const data = generateScoreData(config);
      const gCount = data.filter(m => m.keySignature === 'G').length;

      // Total weight = (1 + 100*5) for G, plus (1) for C, plus (1) for F = 503.
      // Prob(G) = 501/503 ~= 99%.
      expect(gCount).toBeGreaterThan(15);
    });

    it('should balance multiple trouble keys proportionally', () => {
      stats.troubleKeys['G'] = 50;
      stats.troubleKeys['F'] = 50;
      
      const config: GeneratorConfig = {
        measuresPerLine: 1,
        linesCount: 100,
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
      const gCount = data.filter(m => m.keySignature === 'G').length;
      const fCount = data.filter(m => m.keySignature === 'F').length;
      const cCount = data.filter(m => m.keySignature === 'C').length;

      // Weights: G=251, F=251, C=1. Total=503.
      // Prob(G) ~ 50%, Prob(F) ~ 50%, Prob(C) ~ 0.2%
      expect(gCount).toBeGreaterThan(30);
      expect(fCount).toBeGreaterThan(30);
      expect(cCount).toBeLessThan(10);
    });
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
      stats.troubleNotes['C4'] = 1;
      stats.wrongOctaveNotes['C4'] = 10;
      stats.troubleNotes['D4'] = 5;
      
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
      stats.keySignatureMissedNotes['E4'] = 10;
      stats.troubleNotes['F4'] = 5;
      
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
      for (let i = 0; i < 10; i++) {
        recordCorrectNote('G4', 'C', 100); 
      }
      for (let i = 0; i < 10; i++) {
        recordCorrectNote('C4', 'C', 2000);
      }
      
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

  describe('Adaptive Learning Decay (Regression)', () => {
    it('should correctly increment trouble weights on wrong note and decrement on correct note', () => {
      setMusicData([{
        trebleSteps: [['C4']],
        bassSteps: [[]],
        pattern: ['w'],
        keySignature: 'C',
        staffType: 'treble'
      }]);
      setCurrentStepIndex(0);

      initMidiHandler.onNoteOn!({ note: { identifier: 'D4' } } as any);
      
      expect(stats.troubleNotes['C4']).toBeGreaterThan(0);
      expect(stats.troubleOctaves['4']).toBeGreaterThan(0);
      expect(stats.troubleKeys['C']).toBeGreaterThan(0);

      const initialNoteWeight = stats.troubleNotes['C4'];

      initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
      
      expect(stats.troubleNotes['C4']).toBeLessThan(initialNoteWeight!);
    });

    it('should not decay below zero', () => {
      setMusicData([{
        trebleSteps: [['C4']],
        bassSteps: [[]],
        pattern: ['w'],
        keySignature: 'C',
        staffType: 'treble'
      }]);
      setCurrentStepIndex(0);

      initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
      
      expect(stats.troubleNotes['C4'] || 0).toBe(0);
    });
  });
});
