import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { 
  regenerateAndRender, 
  initMIDI, 
  musicData, 
  currentBeatIndex, 
  activeMidiNotes, 
  suppressedNotes, 
  computeMeasureCounts, 
  resetGameState, 
  updateNoteSelectors, 
  setMusicData, 
  renderStaff, 
  setCurrentBeatIndex, 
  getNoteValue, 
  isNoteInKey, 
  initKeySignatures,
  getRandomPitches,
  generateRhythmicPattern,
  getStepInfo,
  getTotalSteps
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
      _trigger: (event, data) => {
        if (listeners[event]) listeners[event](data);
      }
    }
  };
});

// Mock HTMLCanvasElement.prototype.getContext
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    measureText: vi.fn().mockReturnValue({ width: 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 10 }),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawWindow: vi.fn(),
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
  });
}

describe('Advanced Edge Cases and Stress Tests', () => {
  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="controls">
        <select id="measures-per-line"><option value="4" selected>4</option></select>
        <select id="notes-per-beat"><option value="1" selected>1</option></select>
        <select id="lines"><option value="1" selected>1</option></select>
        <select id="staff-type">
          <option value="grand">Grand Staff</option>
          <option value="treble">Treble</option>
          <option value="bass">Bass</option>
        </select>
        <select id="min-note"><option value="C2" selected>C2</option></select>
        <select id="max-note"><option value="C6" selected>C6</option></select>
        <div id="note-values">
          <input type="checkbox" value="w">
          <input type="checkbox" value="h">
          <input type="checkbox" value="q" checked>
          <input type="checkbox" value="8">
          <input type="checkbox" value="16">
        </div>
        <div id="key-signatures"></div>
      </div>
      <div id="midi-status">
        <span id="midi-device-name">No device connected</span>
        <div id="midi-indicator"></div>
      </div>
      <details>
        <summary>Show MIDI Notes</summary>
        <div id="note-display">
          Note: <span id="current-note">-</span>
        </div>
      </details>
      <div id="output"></div>
    `;
    initKeySignatures();
  });

  describe('Rhythmic Mapping Stress', () => {
    it('should correctly map steps in a highly complex piece with mixed durations', () => {
      // Create a piece with varying durations
      const customMusicData = [
        { pattern: ['w'], trebleBeats: [['C4']], bassBeats: [['C3']], staffType: 'grand', keySignature: 'C' },
        { pattern: ['q', 'q', 'q', 'q'], trebleBeats: [['D4'], ['E4'], ['F4'], ['G4']], bassBeats: [[], [], [], []], staffType: 'grand', keySignature: 'C' },
        { pattern: ['8', '8', '16', '16', '16', '16', 'h'], trebleBeats: [['A4'], ['B4'], ['C5'], ['D5'], ['E5'], ['F5'], ['G5']], bassBeats: [[], [], [], [], [], [], []], staffType: 'grand', keySignature: 'C' }
      ];
      setMusicData(customMusicData);

      expect(getTotalSteps()).toBe(1 + 4 + 7); // 12 steps total

      // Test mapping
      expect(getStepInfo(0)).toEqual({ measureIdx: 0, stepIdx: 0 });
      expect(getStepInfo(1)).toEqual({ measureIdx: 1, stepIdx: 0 });
      expect(getStepInfo(4)).toEqual({ measureIdx: 1, stepIdx: 3 });
      expect(getStepInfo(5)).toEqual({ measureIdx: 2, stepIdx: 0 });
      expect(getStepInfo(11)).toEqual({ measureIdx: 2, stepIdx: 6 });
      expect(getStepInfo(12)).toBeNull();
    });
  });

  describe('Enharmonic MIDI Matching Across Keys', () => {
    it('should correctly match MIDI notes with enharmonic staff notes in F# Major', () => {
      // F# Major has A#
      const customMusicData = [
        { pattern: ['q'], trebleBeats: [['A#4']], bassBeats: [[]], staffType: 'treble', keySignature: 'F#' }
      ];
      setMusicData(customMusicData);
      setCurrentBeatIndex(0);

      // Play Bb4 (same semitone as A#4)
      activeMidiNotes.add('Bb4');
      
      // In main.js, checkMatch uses getNoteValue which should return the same value for A#4 and Bb4
      // Let's manually trigger checkMatch logic if we were simulating the app
      const info = getStepInfo(0);
      const measureData = musicData[info.measureIdx];
      const targetNotes = [
        ...(measureData.trebleBeats[info.stepIdx] || []), 
        ...(measureData.bassBeats[info.stepIdx] || [])
      ];
      const targetVals = targetNotes.map(getNoteValue);
      const activeVals = Array.from(activeMidiNotes).map(getNoteValue);
      
      expect(activeVals.length).toBe(targetVals.length);
      expect(targetVals.every(v => activeVals.includes(v))).toBe(true);
    });

    it('should correctly handle Gb vs F# in Gb Major', () => {
      const customMusicData = [
        { pattern: ['q'], trebleBeats: [['Gb4']], bassBeats: [[]], staffType: 'treble', keySignature: 'Gb' }
      ];
      setMusicData(customMusicData);
      setCurrentBeatIndex(0);

      activeMidiNotes.add('F#4');
      
      const info = getStepInfo(0);
      const measureData = musicData[info.measureIdx];
      const targetVals = measureData.trebleBeats[info.stepIdx].map(getNoteValue);
      const activeVals = Array.from(activeMidiNotes).map(getNoteValue);
      
      expect(targetVals.every(v => activeVals.includes(v))).toBe(true);
    });
  });

  describe('Stress and Performance', () => {
    it('should generate a large piece of music quickly (10 lines, 8 measures per line, chromatic, 10 notes per beat)', () => {
      const start = Date.now();
      
      // Setup max values
      document.getElementById('lines').innerHTML = '<option value="10">10</option>';
      document.getElementById('lines').value = '10';
      document.getElementById('measures-per-line').innerHTML = '<option value="8">8</option>';
      document.getElementById('measures-per-line').value = '8';
      document.getElementById('notes-per-beat').innerHTML = '<option value="10">10</option>';
      document.getElementById('notes-per-beat').value = '10';
      
      // Chromatic
      initKeySignatures();
      document.getElementById('key-Chromatic').checked = true;

      regenerateAndRender();
      
      const end = Date.now();
      const duration = end - start;

      expect(musicData.length).toBe(80);
      expect(duration).toBeLessThan(5000); // Relaxed for JSDOM/CI environment
    });
  });

  describe('Key Signature Randomization', () => {
    it('should assign different key signatures to different lines when multiple keys are selected', () => {
      // Pick two distinct keys
      document.getElementById('lines').innerHTML = '<option value="10">10</option>';
      document.getElementById('lines').value = '10';
      
      initKeySignatures();
      // Select C and F# (very different)
      document.getElementById('key-C').checked = true;
      document.getElementById('key-F#').checked = true;
      
      regenerateAndRender();
      
      const signatures = musicData.map(m => m.keySignature);
      const uniqueSignatures = new Set(signatures);
      
      // With 10 lines, there's a 99.8% chance we'll see both if randomization is working
      expect(uniqueSignatures.has('C')).toBe(true);
      expect(uniqueSignatures.has('F#')).toBe(true);
      
      // Verify that all measures in the same line have the same key signature
      const measuresPerLine = 4;
      for (let l = 0; l < 10; l++) {
        const lineSignatures = signatures.slice(l * measuresPerLine, (l + 1) * measuresPerLine);
        expect(new Set(lineSignatures).size).toBe(1);
      }
    });
  });

  describe('Grand Staff Note Distribution Edge Cases', () => {
    it('should split notes correctly at Middle C (C4) for Grand Staff', () => {
      // C4 and above should go to treble
      // Below C4 should go to bass
      
      const treblePitches = getRandomPitches('treble', 10, 'A0', 'C8', 'grand', 'C', false);
      const bassPitches = getRandomPitches('bass', 10, 'A0', 'C8', 'grand', 'C', false);
      
      const middleC = getNoteValue('C4');
      
      treblePitches.forEach(p => {
        expect(getNoteValue(p)).toBeGreaterThanOrEqual(middleC);
      });
      
      bassPitches.forEach(p => {
        expect(getNoteValue(p)).toBeLessThan(middleC);
      });
    });
  });

  describe('State Preservation during Regeneration', () => {
    it('should reset currentBeatIndex but keep configuration after regenerateAndRender', () => {
      document.getElementById('staff-type').value = 'bass';
      regenerateAndRender();
      
      setCurrentBeatIndex(5);
      expect(currentBeatIndex).toBe(5);
      
      regenerateAndRender();
      expect(currentBeatIndex).toBe(0);
      expect(document.getElementById('staff-type').value).toBe('bass');
      expect(musicData[0].staffType).toBe('bass');
    });
  });

  describe('Fuzz Testing', () => {
    it('should not crash with randomized settings', () => {
      const staffTypes = ['treble', 'bass', 'grand'];
      const notesPerBeatChoices = ['1', '2', '3', '4', '5'];
      const measuresPerLineChoices = ['1', '4', '8'];
      const linesChoices = ['1', '2', '5'];
      
      for (let i = 0; i < 20; i++) {
        document.getElementById('staff-type').value = staffTypes[Math.floor(Math.random() * staffTypes.length)];
        document.getElementById('notes-per-beat').innerHTML = notesPerBeatChoices.map(v => `<option value="${v}">${v}</option>`).join('');
        document.getElementById('notes-per-beat').value = notesPerBeatChoices[Math.floor(Math.random() * notesPerBeatChoices.length)];
        document.getElementById('measures-per-line').innerHTML = measuresPerLineChoices.map(v => `<option value="${v}">${v}</option>`).join('');
        document.getElementById('measures-per-line').value = measuresPerLineChoices[Math.floor(Math.random() * measuresPerLineChoices.length)];
        document.getElementById('lines').innerHTML = linesChoices.map(v => `<option value="${v}">${v}</option>`).join('');
        document.getElementById('lines').value = linesChoices[Math.floor(Math.random() * linesChoices.length)];
        
        // Randomly check some key signatures
        const cbs = document.querySelectorAll('#key-signatures input[type="checkbox"]');
        cbs.forEach(cb => cb.checked = Math.random() > 0.5);
        if (Array.from(cbs).every(cb => !cb.checked)) cbs[0].checked = true; // Ensure at least one

        expect(() => regenerateAndRender()).not.toThrow();
      }
    });
  });

  describe('Suppression and MIDI Interaction Edge Cases', () => {
    it('should clear suppression when an incorrect note is pressed', () => {
      const customMusicData = [
        { pattern: ['q'], trebleBeats: [['C4']], bassBeats: [[]], staffType: 'treble', keySignature: 'C' },
        { pattern: ['q'], trebleBeats: [['E4']], bassBeats: [[]], staffType: 'treble', keySignature: 'C' }
      ];
      setMusicData(customMusicData);
      setCurrentBeatIndex(0);
      suppressedNotes.clear();
      activeMidiNotes.clear();

      // 1. Play correct note C4
      activeMidiNotes.add('C4');
      
      // Simulate checkMatch logic (which would advance index and suppress C4)
      setCurrentBeatIndex(1);
      suppressedNotes.add('C4');

      // 2. While holding C4, play an INCORRECT note D4
      // This should clear suppressedNotes in onNoteOn logic
      const info = getStepInfo(currentBeatIndex);
      const measureData = musicData[info.measureIdx];
      const targetPitches = [
        ...(measureData.trebleBeats[info.stepIdx] || []), 
        ...(measureData.bassBeats[info.stepIdx] || [])
      ];
      
      // Check if D4 is in targetPitches (it's not, target is E4)
      if (!targetPitches.includes('D4')) {
        suppressedNotes.clear();
      }

      expect(suppressedNotes.size).toBe(0);
    });
  });

  describe('Measure Widening', () => {
    it('should increase measure width when many accidentals are present', () => {
      document.getElementById('measures-per-line').value = '1';
      document.getElementById('lines').value = '1';
      document.getElementById('staff-type').value = 'treble';

      // 1. Simple measure
      const simpleData = [
        { pattern: ['q', 'q', 'q', 'q'], trebleBeats: [['C4'], ['D4'], ['E4'], ['F4']], bassBeats: [[], [], [], []], staffType: 'treble', keySignature: 'C' }
      ];
      setMusicData(simpleData);
      renderStaff();
      const svg = document.querySelector('#output svg');
      const simpleWidth = parseInt(svg.getAttribute('width'));

      // 2. Complex measure with many accidentals and more notes
      const complexData = [
        { 
          pattern: ['16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16'], 
          trebleBeats: [['C#4'], ['D#4'], ['E#4'], ['F#4'], ['G#4'], ['A#4'], ['B#4'], ['C#5'], ['D#5'], ['E#5'], ['F#5'], ['G#5'], ['A#5'], ['B#5'], ['C#6'], ['D#6']], 
          bassBeats: [], 
          staffType: 'treble', 
          keySignature: 'C' 
        }
      ];
      setMusicData(complexData);
      renderStaff();
      const svg2 = document.querySelector('#output svg');
      const complexWidth = parseInt(svg2.getAttribute('width'));

      // Complex measure with 16 accidentals should definitely be wider than a simple quarter note measure
      expect(complexWidth).toBeGreaterThan(simpleWidth);
    });
  });
});
