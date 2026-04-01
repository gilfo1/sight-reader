import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stats, resetStats, setMusicData, setCurrentStepIndex } from '../../src/engine/state';
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

describe('Adaptive Learning Decay Regression', () => {
  beforeEach(() => {
    resetStats();
    document.body.innerHTML = `
      <div id="midi-device-name"></div>
      <div id="midi-indicator"></div>
      <div id="current-note"></div>
    `;
    initMidiHandler();
  });

  const triggerNoteOn = (note: string) => {
    initMidiHandler.onNoteOn!({ note: { identifier: note } } as any);
  };

  it('should correctly increment trouble weights on wrong note and decrement on correct note', () => {
    // Set up initial state with one note
    setMusicData([{
      trebleSteps: [['C4']],
      bassSteps: [[]],
      pattern: ['w'],
      keySignature: 'C',
      staffType: 'treble'
    }]);
    setCurrentStepIndex(0);

    // Play wrong note (D4)
    triggerNoteOn('D4');
    
    expect(stats.troubleNotes['C4']).toBeGreaterThan(0);
    expect(stats.troubleOctaves['4']).toBeGreaterThan(0);
    expect(stats.troubleKeys['C']).toBeGreaterThan(0);

    const initialNoteWeight = stats.troubleNotes['C4'];
    const initialOctWeight = stats.troubleOctaves['4'];
    const initialKeyWeight = stats.troubleKeys['C'];

    // Now play correct note (C4)
    triggerNoteOn('C4');
    
    // It should have decayed
    expect(stats.troubleNotes['C4']).toBeLessThan(initialNoteWeight!);
    expect(stats.troubleOctaves['4']).toBeLessThan(initialOctWeight!);
    expect(stats.troubleKeys['C']).toBeLessThan(initialKeyWeight!);
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

    // Play correct note when weight is 0
    triggerNoteOn('C4');
    
    expect(stats.troubleNotes['C4'] || 0).toBe(0);
  });
  
  it('should accumulate multiple errors and then recover', () => {
    setMusicData([{
      trebleSteps: [['C4']],
      bassSteps: [[]],
      pattern: ['w'],
      keySignature: 'C',
      staffType: 'treble'
    }]);
    setCurrentStepIndex(0);

    // 3 wrong notes
    triggerNoteOn('D4');
    triggerNoteOn('E4');
    triggerNoteOn('F4');
    
    const highWeight = stats.troubleNotes['C4']!;
    expect(highWeight).toBeGreaterThan(2); // Each error adds 1

    // 1 correct note
    triggerNoteOn('C4');
    expect(stats.troubleNotes['C4']).toBeLessThan(highWeight);
  });
});
