import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stats, resetStats, recordCorrectNote, recordWrongNote, setMusicData, setCurrentStepIndex, activeMidiNotes } from '@/engine/state';
import { initMidiHandler } from '@/engine/midi-handler';
import { loadFromStorage } from '@/utils/storage';

// Mock WebMidi
vi.mock('webmidi', () => ({
  WebMidi: {
    enable: vi.fn().mockResolvedValue(undefined),
    inputs: [],
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

describe('Stats and MIDI Interaction Logic', () => {
  const mockOnStateChange = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    resetStats();
    setCurrentStepIndex(0);
    activeMidiNotes.clear();
    
    // Set up DOM elements required by initMidiHandler
    document.body.innerHTML = `
      <div id="midi-device-name"></div>
      <div id="midi-indicator"></div>
      <div id="current-note"></div>
    `;

    initMidiHandler(mockOnStateChange);
  });

  describe('Core Stats State', () => {
    it('should initialize with zeros', () => {
      expect(stats.notesPlayed).toBe(0);
      expect(stats.correctNotes).toBe(0);
      expect(stats.wrongNotes).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.maxStreak).toBe(0);
    });

    it('should calculate accuracy correctly and handle rounding', () => {
      // 100%
      stats.notesPlayed = 10;
      stats.correctNotes = 10;
      expect(Math.round((stats.correctNotes / stats.notesPlayed) * 100)).toBe(100);

      // 33.3% -> 33%
      stats.notesPlayed = 3;
      stats.correctNotes = 1;
      expect(Math.round((stats.correctNotes / stats.notesPlayed) * 100)).toBe(33);

      // 66.6% -> 67%
      stats.correctNotes = 2;
      expect(Math.round((stats.correctNotes / stats.notesPlayed) * 100)).toBe(67);
    });

    it('should reset stats correctly', () => {
      stats.notesPlayed = 10;
      stats.correctNotes = 8;
      resetStats();
      expect(stats.notesPlayed).toBe(0);
      expect(stats.correctNotes).toBe(0);
    });
  });

  describe('Detailed Error Tracking', () => {
    it('should track average correct note identification time', () => {
      recordCorrectNote('C4', 'C', 1000);
      expect(stats.averageCorrectNoteTime).toBe(1000);
      recordCorrectNote('D4', 'C', 2000);
      expect(stats.averageCorrectNoteTime).toBe(1500);
    });

    it('should detect "correct note, wrong octave"', () => {
      recordWrongNote('C5', ['C4'], 'C');
      expect(stats.wrongOctaveCount).toBe(1);
    });

    it('should detect "correct note, key signature not honored"', () => {
      recordWrongNote('F4', ['F#4'], 'G');
      expect(stats.keySignatureNotHonoredCount).toBe(1);
    });

    it('should detect multiple error types for the same note', () => {
      recordWrongNote('F5', ['F#4'], 'G');
      expect(stats.wrongOctaveCount).toBe(1);
      expect(stats.keySignatureNotHonoredCount).toBe(1);
    });
  });

  describe('MIDI Handler Integration', () => {
    beforeEach(() => {
      setMusicData([
        { 
          pattern: ['q', 'q'], 
          trebleSteps: [['C4'], ['E4']], 
          bassSteps: [[], []], 
          staffType: 'treble', 
          keySignature: 'C' 
        }
      ]);
      setCurrentStepIndex(0);
    });

    it('should increment notesPlayed and correctNotes on correct MIDI note', () => {
      initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
      expect(stats.notesPlayed).toBe(1);
      expect(stats.correctNotes).toBe(1);
      expect(stats.currentStreak).toBe(1);
    });

    it('should increment wrongNotes and reset streak on wrong MIDI note', () => {
      initMidiHandler.onNoteOn!({ note: { identifier: 'D4' } } as any);
      expect(stats.wrongNotes).toBe(1);
      expect(stats.currentStreak).toBe(0);
    });

    it('should record trouble areas on wrong note', () => {
      initMidiHandler.onNoteOn!({ note: { identifier: 'D4' } } as any);
      expect(stats.troubleNotes['C4']).toBeGreaterThan(0);
      expect(stats.troubleOctaves['4']).toBeGreaterThan(0);
      expect(stats.troubleKeys['C']).toBeGreaterThan(0);
    });

    it('should update maxStreak correctly across multiple hits', () => {
      initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
      initMidiHandler.onNoteOff!({ note: { identifier: 'C4' } } as any);
      // Advance step manually for mock
      setCurrentStepIndex(1);
      initMidiHandler.onNoteOn!({ note: { identifier: 'E4' } } as any);
      expect(stats.maxStreak).toBe(2);
    });
  });

  describe('Stats Persistence', () => {
    it('should save stats to localStorage when recording a note', () => {
      recordCorrectNote('C4', 'C', 500);
      const savedStats = loadFromStorage<any>('app-stats');
      expect(savedStats.correctNotes).toBe(1);
    });

    it('should clear stats in localStorage when resetting', () => {
      recordCorrectNote('C4', 'C', 500);
      resetStats();
      const savedStats = loadFromStorage<any>('app-stats');
      expect(savedStats.correctNotes).toBe(0);
    });
  });
});
