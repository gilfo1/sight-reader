import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initMidiHandler } from '@/engine/midi-handler';
import { stats, resetStats, setMusicData, setCurrentStepIndex } from '../../../src/engine/state';
import { generateScoreData } from '@/engine/music-generator';
import { getUIConfig } from '@/ui/controls';

// Mock WebMidi
vi.mock('webmidi', () => ({
  WebMidi: {
    enable: vi.fn().mockResolvedValue(undefined),
    inputs: [],
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

describe('Adaptive Learning Integration', () => {
  beforeEach(() => {
    resetStats();
    setCurrentStepIndex(0);
    
    document.body.innerHTML = `
      <select id="staff-type"><option value="treble">Treble</option></select>
      <select id="min-note"></select>
      <select id="max-note"></select>
      <select id="measures-per-line"><option value="1">1</option></select>
      <select id="notes-per-step"><option value="1">1</option></select>
      <select id="lines"><option value="1">1</option></select>
      <div id="note-values"><input type="checkbox" value="q" checked></div>
      <div id="key-signatures"><input type="checkbox" value="C" checked></div>
      <input type="checkbox" id="adaptive-learning">
      
      <div id="midi-device-name"></div>
      <div id="midi-indicator"></div>
      <div id="current-note"></div>
    `;

    // Initialize MIDI handler
    initMidiHandler();
  });

  it('should record trouble areas when a wrong note is played', () => {
    // Set up music data with a known target
    setMusicData([
      { 
        pattern: ['q'], 
        trebleSteps: [['C4']], 
        bassSteps: [[]], 
        staffType: 'treble', 
        keySignature: 'C' 
      }
    ]);

    // Simulate wrong note 'D4' instead of 'C4'
    const event = { note: { identifier: 'D4' } } as any;
    initMidiHandler.onNoteOn!(event);

    expect(stats.wrongNotes).toBe(1);
    expect(stats.troubleNotes['C4']).toBe(1);
    expect(stats.troubleOctaves['4']).toBe(1);
    expect(stats.troubleKeys['C']).toBe(1);
  });

  it('should influence music generation when adaptive learning is enabled via UI', () => {
    const adaptiveCheckbox = document.getElementById('adaptive-learning') as HTMLInputElement;
    adaptiveCheckbox.checked = true;

    // Simulate 100 errors on 'E4'
    stats.troubleNotes['E4'] = 100;

    // Trigger regeneration
    const config = getUIConfig();
    expect(config.isAdaptive).toBe(true);
    
    // Generate 100 measures and see how many E4s we get
    let e4Count = 0;
    for (let i = 0; i < 100; i++) {
        const data = generateScoreData({
            ...config,
            measuresPerLine: 1,
            linesCount: 1,
            minNote: 'C4',
            maxNote: 'G4'
        });
        if (data[0].trebleSteps.some(step => step.includes('E4'))) {
            e4Count++;
        }
    }

    // With 5 possible notes (C,D,E,F,G), without bias it would be ~20.
    // With 100 errors, E4 weight is 301, others are 1. Total 305.
    // Prob should be > 90%.
    expect(e4Count).toBeGreaterThan(80);
  });
});
