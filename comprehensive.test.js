import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebMidi } from 'webmidi';
import { 
  getNoteValue, 
  isNoteInKey, 
  getStepInfo, 
  getTotalSteps,
  musicData,
  setMusicData,
  updateNoteSelectors,
  generateRhythmicPattern,
  getRandomPitches,
  initMIDI,
  currentBeatIndex,
  resetGameState,
  renderStaff,
  computeMeasureCounts,
  initKeySignatures,
  regenerateAndRender
} from './main.js';

// Mock WebMidi
vi.mock('webmidi', () => {
  const listeners = {};
  return {
    WebMidi: {
      enable: vi.fn().mockResolvedValue(true),
      inputs: [],
      addListener: vi.fn((event, callback) => {
        listeners[event] = callback;
      }),
      removeListener: vi.fn(),
      // Helper to trigger events in tests
      _trigger: (event, data) => {
        if (listeners[event]) listeners[event](data);
      }
    }
  };
});

// Mocking required for environment setup
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    measureText: vi.fn().mockReturnValue({ width: 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 10 }),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setTransform: vi.fn(),
  });
}

describe('Comprehensive Unit Tests', () => {

  describe('getNoteValue', () => {
    it('should correctly calculate MIDI-like values for standard notes', () => {
      expect(getNoteValue('C4')).toBe(60);
      expect(getNoteValue('A4')).toBe(69);
      expect(getNoteValue('C5')).toBe(72);
    });

    it('should handle sharps and flats correctly', () => {
      expect(getNoteValue('C#4')).toBe(61);
      expect(getNoteValue('Db4')).toBe(61);
      expect(getNoteValue('Eb4')).toBe(63);
      expect(getNoteValue('D#4')).toBe(63);
    });

    it('should handle octave boundaries correctly', () => {
      expect(getNoteValue('B3')).toBe(59);
      expect(getNoteValue('C4')).toBe(60);
      expect(getNoteValue('B4')).toBe(71);
      expect(getNoteValue('C5')).toBe(72);
    });

    it('should handle enharmonics like B# and Cb', () => {
      expect(getNoteValue('B#3')).toBe(60);
      expect(getNoteValue('Cb4')).toBe(59);
      expect(getNoteValue('E#4')).toBe(65); // Same as F4
      expect(getNoteValue('Fb4')).toBe(64); // Same as E4
    });

    it('should return -1 for invalid note names', () => {
      expect(getNoteValue('H4')).toBe(-1);
      expect(getNoteValue('C')).toBe(-1);
      expect(getNoteValue('4')).toBe(-1);
    });
  });

  describe('isNoteInKey', () => {
    const testCases = [
      { key: 'C', in: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], out: ['C#', 'Eb', 'F#', 'Ab', 'Bb'] },
      { key: 'G', in: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'], out: ['Gb', 'Ab', 'Bb', 'C#', 'Eb', 'F'] },
      { key: 'F', in: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], out: ['F#', 'G#', 'A#', 'B', 'C#', 'Eb'] }, // Note: B is out in F
      { key: 'D', in: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'], out: ['Eb', 'F', 'G#', 'Bb', 'C'] },
      { key: 'Bb', in: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'], out: ['B', 'C#', 'D#', 'E', 'F#', 'G#'] },
    ];

    testCases.forEach(({ key, in: inside, out: outside }) => {
      it(`should correctly identify notes in ${key} Major`, () => {
        inside.forEach(note => expect(isNoteInKey(note, key)).toBe(true));
        outside.forEach(note => {
            // Note that isNoteInKey(name, key) returns false for notes not in the scale
            // But we must be careful with enharmonics.
            // isNoteInKey checks if name is in SCALES[key]
            expect(isNoteInKey(note, key)).toBe(false);
        });
      });
    });
  });

  describe('Step and Progress Mapping', () => {
    beforeEach(() => {
      setMusicData([
        { pattern: ['q', 'q', 'q', 'q'] }, // 4 steps
        { pattern: ['h', 'h'] },          // 2 steps
        { pattern: ['8', '8', '8', '8', 'q', 'q'] } // 6 steps
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

  describe('Note Range Filtering UI', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <select id="staff-type">
          <option value="treble">Treble</option>
          <option value="bass">Bass</option>
          <option value="grand" selected>Grand Staff</option>
        </select>
        <select id="min-note"></select>
        <select id="max-note"></select>
      `;
    });

    it('should restrict ranges for Treble Clef (C3-C6)', () => {
      document.getElementById('staff-type').value = 'treble';
      updateNoteSelectors();
      const options = Array.from(document.getElementById('min-note').options).map(o => o.value);
      expect(options[0]).toBe('C3');
      expect(options[options.length - 1]).toBe('C6');
    });

    it('should restrict ranges for Bass Clef (C1-C5)', () => {
      document.getElementById('staff-type').value = 'bass';
      updateNoteSelectors();
      const options = Array.from(document.getElementById('min-note').options).map(o => o.value);
      expect(options[0]).toBe('C1');
      expect(options[options.length - 1]).toBe('C5');
    });

    it('should show full piano range for Grand Staff (A0-C8)', () => {
      document.getElementById('staff-type').value = 'grand';
      updateNoteSelectors();
      const options = Array.from(document.getElementById('min-note').options).map(o => o.value);
      expect(options[0]).toBe('A0');
      expect(options[options.length - 1]).toBe('C8');
    });
  });

  describe('Rhythmic Pattern Generation', () => {

    it('should always sum to 16 for various selections', () => {
      const selections = [['w'], ['h'], ['q'], ['8'], ['16'], ['h', 'q', '8']];
      selections.forEach(sel => {
        for (let i = 0; i < 20; i++) {
          const pattern = generateRhythmicPattern(sel);
          const sum = pattern.reduce((acc, d) => {
            const weights = { 'w': 16, 'h': 8, 'q': 4, '8': 2, '16': 1 };
            return acc + weights[d];
          }, 0);
          expect(sum).toBe(16);
        }
      });
    });

    it('should fall back to largest fitting duration if selection is empty', () => {
        const pattern = generateRhythmicPattern([]);
        expect(pattern).toEqual(['w']);
    });

    it('should strictly use selected durations if they fit', () => {
        const pattern = generateRhythmicPattern(['h']);
        expect(pattern).toEqual(['h', 'h']);
    });
  });

  describe('Random Pitch Generation and Distribution', () => {

    it('should respect staff split for Grand Staff (Notes per Beat = 1)', () => {
      // For Grand Staff, 1 note per beat should be EITHER treble or bass (already tested in main.test.js)
      // but let's test the underlying getRandomPitches logic
      const treble = getRandomPitches('treble', 1, 'C2', 'C6', 'grand');
      const bass = getRandomPitches('bass', 1, 'C2', 'C6', 'grand');
      
      // Values should be in range
      expect(getNoteValue(treble[0])).toBeGreaterThanOrEqual(getNoteValue('C4')); // Middle C split
      expect(getNoteValue(bass[0])).toBeLessThan(getNoteValue('C4'));
    });

    it('should split notes correctly for larger counts (Notes per Beat = 5)', () => {
        // 5 notes should be 3 in treble, 2 in bass for Grand Staff
        const treble = getRandomPitches('treble', 3, 'C2', 'C6', 'grand');
        const bass = getRandomPitches('bass', 2, 'C2', 'C6', 'grand');
        expect(treble.length).toBe(3);
        expect(bass.length).toBe(2);
    });

    it('should generate chromatic notes with correct sharp/flat preference', () => {
        // In G major (sharp key), should prefer sharps
        let sharps = 0;
        let flats = 0;
        for (let i = 0; i < 100; i++) {
            const p = getRandomPitches('treble', 1, 'C3', 'C6', 'treble', 'G', true)[0];
            if (p.includes('#')) sharps++;
            if (p.includes('b')) flats++;
        }
        // Probabilistic, but should favor sharps (80/20)
        expect(sharps).toBeGreaterThan(flats);

        // In F major (flat key), should prefer flats
        sharps = 0;
        flats = 0;
        for (let i = 0; i < 100; i++) {
            const p = getRandomPitches('treble', 1, 'C3', 'C6', 'treble', 'F', true)[0];
            if (p.includes('#')) sharps++;
            if (p.includes('b')) flats++;
        }
        expect(flats).toBeGreaterThan(sharps);
    });

    it('should randomize key signatures per line when multiple are selected', () => {
        resetGameState();
        document.body.innerHTML = `
            <div id="controls">
                <select id="measures-per-line"><option value="1">1</option></select>
                <select id="lines"><option value="10">10</option></select>
                <select id="staff-type"><option value="treble">treble</option></select>
                <select id="notes-per-beat"><option value="1">1</option></select>
                <select id="min-note"><option value="C3">C3</option></select>
                <select id="max-note"><option value="C6">C6</option></select>
                <div id="key-signatures"></div>
            </div>
            <div id="output"></div>
        `;
        initKeySignatures();
        // Check G and F
        document.getElementById('key-C').checked = false;
        document.getElementById('key-G').checked = true;
        document.getElementById('key-F').checked = true;
        
        regenerateAndRender();
        
        const keysUsed = new Set(musicData.map(m => m.keySignature));
        expect(keysUsed.has('G')).toBe(true);
        expect(keysUsed.has('F')).toBe(true);
        expect(keysUsed.size).toBe(2);
    });

    it('should generate both sharps and flats in Chromatic mode when in C major', () => {
        let hasSharp = false;
        let hasFlat = false;
        for (let i = 0; i < 200; i++) {
            const p = getRandomPitches('treble', 1, 'C3', 'C6', 'treble', 'C', true)[0];
            if (p.includes('#')) hasSharp = true;
            if (p.includes('b')) hasFlat = true;
            if (hasSharp && hasFlat) break;
        }
        expect(hasSharp).toBe(true);
        expect(hasFlat).toBe(true);
    });
  });

  describe('Grand Staff Alternation (Notes per Beat = 1)', () => {
    it('should alternate between treble and bass clefs over multiple beats', () => {
        // computeMeasureCounts handles this
        const { trebleCounts, bassCounts } = computeMeasureCounts('grand', 1, 0, ['q', 'q', 'q', 'q']);
        // Measure 0:
        // Beat 0: (0+0)%2=0 -> Treble
        // Beat 1: (1+0)%2=1 -> Bass
        // Beat 2: (2+0)%2=0 -> Treble
        // Beat 3: (3+0)%2=1 -> Bass
        expect(trebleCounts).toEqual([1, 0, 1, 0]);
        expect(bassCounts).toEqual([0, 1, 0, 1]);

        const nextMeasure = computeMeasureCounts('grand', 1, 1, ['q', 'q', 'q', 'q']);
        // Measure 1:
        // Beat 0: (0+1)%2=1 -> Bass
        // Beat 1: (1+1)%2=0 -> Treble
        // ...
        expect(nextMeasure.trebleCounts).toEqual([0, 1, 0, 1]);
        expect(nextMeasure.bassCounts).toEqual([1, 0, 1, 0]);
    });
  });

  describe('MIDI Matching and Variable Rhythms', () => {

    beforeEach(() => {
        resetGameState();
        document.body.innerHTML = `
            <div id="midi-status"><span id="midi-device-name"></span><div id="midi-indicator"></div></div>
            <div id="note-display"><span id="current-note"></span></div>
            <div id="output"></div>
            <div id="controls">
                <select id="measures-per-line"><option value="1">1</option></select>
                <select id="lines"><option value="1">1</option></select>
                <select id="staff-type"><option value="treble">treble</option></select>
                <select id="notes-per-beat"><option value="1">1</option></select>
                <select id="min-note"><option value="C3">C3</option></select>
                <select id="max-note"><option value="C6">C6</option></select>
                <div id="key-signatures"></div>
            </div>
        `;
        initMIDI();
    });

    it('should advance through measures with mixed rhythms', async () => {
        let noteOnCallback;
        let noteOffCallback;
        const mockInput = {
          name: 'Mock MIDI Keyboard',
          type: 'input',
          addListener: vi.fn((event, cb) => {
            if (event === 'noteon') noteOnCallback = cb;
            if (event === 'noteoff') noteOffCallback = cb;
          }),
          removeListener: vi.fn(),
        };
        WebMidi.inputs = [mockInput];
        
        // Wait for connection to be processed
        WebMidi._trigger('connected', { port: mockInput });
        await new Promise(resolve => setTimeout(resolve, 0));

        setMusicData([
            {
                trebleBeats: [['C4'], ['D4'], ['E4']],
                bassBeats: [[], [], []],
                pattern: ['h', 'q', 'q'],
                keySignature: 'C'
            }
        ]);
        
        // Match C4 (Half note)
        noteOnCallback({ note: { identifier: 'C4' } });
        expect(currentBeatIndex).toBe(1);
        noteOffCallback({ note: { identifier: 'C4' } });

        // Match D4 (Quarter note)
        noteOnCallback({ note: { identifier: 'D4' } });
        expect(currentBeatIndex).toBe(2);
        noteOffCallback({ note: { identifier: 'D4' } });

        // Match E4 (Quarter note)
        noteOnCallback({ note: { identifier: 'E4' } });
        expect(currentBeatIndex).toBe(0);
    });
  });

  describe('Measure Widening Logic', () => {

    it('should calculate larger widths for measures with more accidentals/notes', () => {
        resetGameState();
        document.body.innerHTML = `
            <div id="output"></div>
            <select id="measures-per-line"><option value="1">1</option></select>
            <select id="lines"><option value="1">1</option></select>
            <select id="staff-type"><option value="grand">grand</option></select>
        `;
        document.getElementById('measures-per-line').value = '1';
        
        // Simple measure: 1 quarter note
        setMusicData([{ trebleBeats: [['C4']], bassBeats: [[]], pattern: ['q'], keySignature: 'C' }]);
        renderStaff();
        const width1 = parseFloat(document.querySelector('svg').getAttribute('width'));

        resetGameState();
        document.getElementById('measures-per-line').value = '1';
        // Complex measure: 16 sixteenth notes, each with many accidental chord notes
        const sixteenBeats = [];
        for (let i = 0; i < 16; i++) {
            sixteenBeats.push(['C#4', 'D#4', 'F#4', 'G#4', 'A#4']);
        }
        setMusicData([{ 
            trebleBeats: sixteenBeats, 
            bassBeats: sixteenBeats, 
            pattern: new Array(16).fill('16'), 
            keySignature: 'C' 
        }]);
        renderStaff();
        const width2 = parseFloat(document.querySelector('svg').getAttribute('width'));

        expect(width2).toBeGreaterThan(width1);
    });
  });
});
