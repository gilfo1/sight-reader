import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initMidiHandler } from '../../../src/engine/midi-handler';
import { stats, resetStats, setMusicData, setCurrentStepIndex, activeMidiNotes } from '../../../src/engine/state';

// Mock WebMidi
vi.mock('webmidi', () => ({
  WebMidi: {
    enable: vi.fn().mockResolvedValue(undefined),
    inputs: [],
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

describe('MIDI Stats Logic', () => {
  const mockOnStateChange = vi.fn();

  beforeEach(() => {
    resetStats();
    setCurrentStepIndex(0);
    activeMidiNotes.clear();
    // Mock music data
    setMusicData([
      { 
        pattern: ['q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'q'], 
        trebleSteps: [['C4'], ['C4'], ['C4'], ['C4'], ['C4'], ['C4'], ['C4'], ['C4'], ['C4'], ['C4']], 
        bassSteps: [[], [], [], [], [], [], [], [], [], []], 
        staffType: 'treble', 
        keySignature: 'C' 
      }
    ]);
    
    // Set up DOM elements required by initMidiHandler
    document.body.innerHTML = `
      <div id="midi-device-name"></div>
      <div id="midi-indicator"></div>
      <div id="current-note"></div>
    `;

    initMidiHandler(mockOnStateChange);
  });

  it('should increment notesPlayed on any note on', () => {
    const event = { note: { identifier: 'D4' } } as any;
    initMidiHandler.onNoteOn!(event);
    expect(stats.notesPlayed).toBe(1);
  });

  it('should increment correctNotes and streak on correct note', () => {
    const event = { note: { identifier: 'C4' } } as any;
    initMidiHandler.onNoteOn!(event);
    expect(stats.notesPlayed).toBe(1);
    expect(stats.correctNotes).toBe(1);
    expect(stats.wrongNotes).toBe(0);
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(1);
  });

  it('should increment wrongNotes and reset streak on wrong note', () => {
    // First a correct note
    initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
    expect(stats.currentStreak).toBe(1);
    initMidiHandler.onNoteOff!({ note: { identifier: 'C4' } } as any);

    // Then a wrong note (at step 1)
    initMidiHandler.onNoteOn!({ note: { identifier: 'D4' } } as any);
    expect(stats.notesPlayed).toBe(2);
    expect(stats.correctNotes).toBe(1);
    expect(stats.wrongNotes).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(1);
  });

  it('should update maxStreak correctly', () => {
    // Multiple correct notes
    initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
    initMidiHandler.onNoteOff!({ note: { identifier: 'C4' } } as any);
    initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
    expect(stats.maxStreak).toBe(2);

    // Wrong note
    initMidiHandler.onNoteOff!({ note: { identifier: 'C4' } } as any);
    initMidiHandler.onNoteOn!({ note: { identifier: 'D4' } } as any);
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(2);

    // More correct notes
    initMidiHandler.onNoteOff!({ note: { identifier: 'D4' } } as any);
    initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
    initMidiHandler.onNoteOff!({ note: { identifier: 'C4' } } as any);
    initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
    initMidiHandler.onNoteOff!({ note: { identifier: 'C4' } } as any);
    initMidiHandler.onNoteOn!({ note: { identifier: 'C4' } } as any);
    expect(stats.currentStreak).toBe(3);
    expect(stats.maxStreak).toBe(3);
  });
});
