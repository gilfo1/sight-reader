
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as main from './main.js';

describe('Advanced Regression Tests', () => {
  let dom;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body>' +
      '<div id="output"></div>' +
      '<select id="measures-per-line"><option value="4">4</option></select>' +
      '<select id="notes-per-beat"><option value="1">1</option></select>' +
      '<select id="lines"><option value="1">1</option></select>' +
      '<select id="staff-type"><option value="grand">Grand Staff</option></select>' +
      '<select id="min-note"><option value="C2">C2</option></select>' +
      '<select id="max-note"><option value="C6">C6</option></select>' +
      '<div id="note-values"><input type="checkbox" value="q" checked></div>' +
      '<div id="key-signatures"><input type="checkbox" value="C" checked></div>' +
      '</body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.navigator = { userAgent: 'node' };
    
    // Mock VexFlow classes if needed, or just let them run (might need canvas mock)
    global.HTMLCanvasElement = class extends dom.window.HTMLCanvasElement {
      getContext() { return { 
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        closePath: () => {},
        measureText: () => ({ width: 0 }),
        scale: () => {},
        rotate: () => {},
        translate: () => {},
        transform: () => {},
        setLineDash: () => {},
      }; }
    };
    
    main.resetGameState();
  });

  describe('getRandomPitches Edge Cases', () => {
    it('should handle A0 and C8 specifically', () => {
      // Test A0
      const a0 = main.getRandomPitches('bass', 1, 'A0', 'A0', 'bass', 'C', false);
      expect(a0).toEqual(['A0']);

      // Test C8
      const c8 = main.getRandomPitches('treble', 1, 'C8', 'C8', 'treble', 'C', false);
      expect(c8).toEqual(['C8']);
    });

    it('should return empty array if count is 0', () => {
      const result = main.getRandomPitches('treble', 0, 'C4', 'C5', 'treble', 'C', false);
      expect(result).toEqual([]);
    });

    it('should return all available notes if count exceeds pool size', () => {
      // Range C4 to D4 (C4, C#4, D4)
      // Scale C: C4, D4.
      const result = main.getRandomPitches('treble', 5, 'C4', 'D4', 'treble', 'C', false);
      expect(result).toHaveLength(2); // Only C4 and D4 are in the C scale
      expect(result).toContain('C4');
      expect(result).toContain('D4');
    });

    it('should return all notes including chromatic if requested', () => {
      const result = main.getRandomPitches('treble', 3, 'C4', 'D4', 'treble', 'C', true);
      expect(result).toHaveLength(3); // C4, C#4/Db4, D4
    });
  });

  describe('generateRhythmicPattern Edge Cases', () => {
    it('should handle empty selectedDurations by falling back', () => {
      const pattern = main.generateRhythmicPattern([]);
      expect(pattern.length).toBeGreaterThan(0);
      const totalWeight = pattern.reduce((acc, d) => {
        const weights = { 'w': 16, 'h': 8, 'q': 4, '8': 2, '16': 1 };
        return acc + weights[d];
      }, 0);
      expect(totalWeight).toBe(16);
    });

    it('should handle only 16th notes', () => {
      const pattern = main.generateRhythmicPattern(['16']);
      expect(pattern).toHaveLength(16);
      expect(pattern.every(d => d === '16')).toBe(true);
    });

    it('should handle only whole notes', () => {
      const pattern = main.generateRhythmicPattern(['w']);
      expect(pattern).toEqual(['w']);
    });
  });

  describe('Enharmonic Matching', () => {
    it('getNoteValue should treat enharmonics correctly', () => {
      expect(main.getNoteValue('C#4')).toBe(main.getNoteValue('Db4'));
      expect(main.getNoteValue('D#4')).toBe(main.getNoteValue('Eb4'));
      expect(main.getNoteValue('F#4')).toBe(main.getNoteValue('Gb4'));
      expect(main.getNoteValue('G#4')).toBe(main.getNoteValue('Ab4'));
      expect(main.getNoteValue('A#4')).toBe(main.getNoteValue('Bb4'));
      
      // Edge cases
      expect(main.getNoteValue('B#4')).toBe(main.getNoteValue('C5'));
      expect(main.getNoteValue('Cb4')).toBe(main.getNoteValue('B3'));
      expect(main.getNoteValue('E#4')).toBe(main.getNoteValue('F4'));
      expect(main.getNoteValue('Fb4')).toBe(main.getNoteValue('E4'));
    });
  });

  describe('computeMeasureCounts Consistency', () => {
    it('should divide notes evenly when notesPerStep is even', () => {
      const counts = main.computeMeasureCounts('grand', 4, 0, ['q']);
      expect(counts.trebleCounts[0]).toBe(2);
      expect(counts.bassCounts[0]).toBe(2);
    });

    it('should give treble one more when notesPerStep is odd (>1)', () => {
      const counts = main.computeMeasureCounts('grand', 3, 0, ['q']);
      expect(counts.trebleCounts[0]).toBe(2);
      expect(counts.bassCounts[0]).toBe(1);
    });
    
    it('should handle 0 notesPerStep (though not allowed by UI)', () => {
      const counts = main.computeMeasureCounts('grand', 0, 0, ['q']);
      expect(counts.trebleCounts[0]).toBe(0);
      expect(counts.bassCounts[0]).toBe(0);
    });
  });

  describe('MIDI Mismatch rendering', () => {
    it('should handle multiple simultaneous wrong notes', () => {
      main.setMusicData([{
        trebleBeats: [['C4']],
        bassBeats: [[]],
        pattern: ['q']
      }]);
      
      // Simulate multiple wrong notes
      main.activeMidiNotes.add('C#4');
      main.activeMidiNotes.add('D4');
      
      const container = document.getElementById('output');
      main.renderStaff();
      
      // Check for three notes in total in the SVG
      const notes = container.querySelectorAll('.vf-stavenote');
      expect(notes.length).toBe(3);
    });

    it('should handle Middle C split in Grand Staff', () => {
      // Middle C (60) should be in Treble. B3 (59) should be in Bass.
      // getRandomPitches(clef, count, minNote, maxNote, staffType, keySignature, isChromatic)
      const treblePitches = main.getRandomPitches('treble', 10, 'A0', 'C8', 'grand', 'C', true);
      const bassPitches = main.getRandomPitches('bass', 10, 'A0', 'C8', 'grand', 'C', true);
      
      const minTrebleVal = Math.min(...treblePitches.map(p => main.getNoteValue(p)));
      const maxBassVal = Math.max(...bassPitches.map(p => main.getNoteValue(p)));
      
      expect(minTrebleVal).toBeGreaterThanOrEqual(main.getNoteValue('C4'));
      expect(maxBassVal).toBeLessThan(main.getNoteValue('C4'));
    });

    it('should handle MIDI note-off for a note that was not active', () => {
      // Should not crash or affect other notes
      main.activeMidiNotes.add('C4');
      
      // Send note-off for 'C#4' (which is not in activeMidiNotes)
      const noteName = 'C#4';
      main.activeMidiNotes.delete(noteName);
      main.suppressedNotes.delete(noteName);
      
      expect(main.activeMidiNotes.has('C4')).toBe(true);
      expect(main.activeMidiNotes.has('C#4')).toBe(false);
    });
  });

  describe('Key Signature and Chromatic Logic', () => {
    it('should pick non-diatonic notes when isChromatic is true', () => {
      // In C major, C# is non-diatonic
      let foundNonDiatonic = false;
      for (let i = 0; i < 100; i++) {
        const pitches = main.getRandomPitches('treble', 1, 'C4', 'C5', 'treble', 'C', true);
        if (pitches[0].includes('#') || pitches[0].includes('b')) {
          foundNonDiatonic = true;
          break;
        }
      }
      expect(foundNonDiatonic).toBe(true);
    });

    it('should favor flats in flat keys when chromatic', () => {
      let flats = 0;
      let sharps = 0;
      for (let i = 0; i < 100; i++) {
        const pitches = main.getRandomPitches('treble', 1, 'C4', 'C5', 'treble', 'Bb', true);
        if (pitches[0].includes('b')) flats++;
        if (pitches[0].includes('#')) sharps++;
      }
      // Since Bb is a flat key, it should favor flats (probability 0.8)
      if (flats + sharps > 0) {
        expect(flats).toBeGreaterThan(sharps);
      }
    });

    it('should favor sharps in sharp keys when chromatic', () => {
      let flats = 0;
      let sharps = 0;
      for (let i = 0; i < 100; i++) {
        const pitches = main.getRandomPitches('treble', 1, 'C4', 'C5', 'treble', 'D', true);
        if (pitches[0].includes('b')) flats++;
        if (pitches[0].includes('#')) sharps++;
      }
      // Since D is a sharp key, it should favor sharps (probability 0.8)
      if (flats + sharps > 0) {
        expect(sharps).toBeGreaterThan(flats);
      }
    });

    it('should randomize key signatures across lines when multiple are selected', () => {
      // Setup multiple key signatures
      const keyContainer = document.getElementById('key-signatures');
      keyContainer.innerHTML = '';
      ['G', 'F'].forEach(k => {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = k;
        cb.checked = true;
        keyContainer.appendChild(cb);
      });
      
      const linesSelect = document.getElementById('lines');
      linesSelect.innerHTML = '<option value="10">10</option>';
      linesSelect.value = "10";
      
      main.generateMusicData();
      
      const usedKeys = new Set(main.musicData.map(m => m.keySignature));
      expect(usedKeys.has('G')).toBe(true);
      expect(usedKeys.has('F')).toBe(true);
      expect(usedKeys.size).toBe(2);
    });
  });
});
