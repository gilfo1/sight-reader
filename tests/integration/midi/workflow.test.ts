import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initMidiHandler, checkMatch, activeMidiNotes, resetGameState, currentStepIndex, setMusicData } from '../../../src/main';
import { WebMidi } from 'webmidi';

// Mock WebMidi
vi.mock('webmidi', () => {
  const listeners: Record<string, any> = {};
  return {
    WebMidi: {
      enable: vi.fn().mockResolvedValue(true),
      inputs: [],
      addListener: vi.fn((event: string, callback: any) => {
        listeners[event] = callback;
      }),
      removeListener: vi.fn(),
      // Helper to trigger events in tests
      _trigger: (event: string, data: any) => {
        if (listeners[event]) listeners[event](data);
      }
    }
  };
});

describe('MIDI Workflow Integration', () => {
  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="midi-status">
        <span id="midi-device-name">No device connected</span>
        <div id="midi-indicator" style="background-color: red;"></div>
      </div>
      <details>
        <summary>Show MIDI Notes</summary>
        <div id="note-display">
          Note: <span id="current-note">-</span>
        </div>
      </details>
      <div id="output"></div>
    `;
    vi.clearAllMocks();
    (WebMidi as any).inputs = [];
  });

  it('should initialize MIDI and update status when a device is connected', async () => {
    initMidiHandler();
    
    // Wait for WebMidi.enable()
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(WebMidi.enable).toHaveBeenCalled();

    // Simulate a device connection
    const mockInput = {
      name: 'Mock MIDI Keyboard',
      type: 'input',
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    (WebMidi as any).inputs = [mockInput];
    
    // Trigger the "connected" event
    (WebMidi as any)._trigger('connected', { port: mockInput });

    const deviceName = document.getElementById('midi-device-name')!;
    const indicator = document.getElementById('midi-indicator')!;

    expect(deviceName.textContent).toBe('Mock MIDI Keyboard');
    expect(indicator.style.backgroundColor).toBe('green');
  });

  it('should handle note on and off events', async () => {
    initMidiHandler();
    await new Promise(resolve => setTimeout(resolve, 0));

    let noteOnCallback: any;
    let noteOffCallback: any;
    const mockInput = {
      name: 'Mock MIDI Keyboard',
      type: 'input',
      addListener: vi.fn((event: string, cb: any) => {
        if (event === 'noteon') noteOnCallback = cb;
        if (event === 'noteoff') noteOffCallback = cb;
      }),
      removeListener: vi.fn(),
    };
    (WebMidi as any).inputs = [mockInput];
    (WebMidi as any)._trigger('connected', { port: mockInput });

    const noteDisplay = document.getElementById('current-note')!;

    // Note On
    noteOnCallback({ note: { identifier: 'C4' } });
    expect(noteDisplay.textContent).toBe('C4');
    expect(activeMidiNotes.has('C4')).toBe(true);

    // Another Note On
    noteOnCallback({ note: { identifier: 'E4' } });
    expect(noteDisplay.textContent).toBe('C4, E4');

    // Note Off
    noteOffCallback({ note: { identifier: 'C4' } });
    expect(noteDisplay.textContent).toBe('E4');
    expect(activeMidiNotes.has('C4')).toBe(false);
  });

  it('should advance the current step when correct notes are played', () => {
    const data = [
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ];
    setMusicData(data);
    
    const onMatch = vi.fn();
    initMidiHandler(onMatch);
    
    // Simulate correct note
    activeMidiNotes.add('C4');
    checkMatch();
    
    expect(currentStepIndex).toBe(1);
    expect(onMatch).toHaveBeenCalled();
  });

  it('should not advance if incorrect notes are played', () => {
    const data = [
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ];
    setMusicData(data);
    
    const onMatch = vi.fn();
    initMidiHandler(onMatch);
    
    // Simulate wrong note
    activeMidiNotes.add('D4');
    checkMatch();
    
    expect(currentStepIndex).toBe(0);
    expect(onMatch).not.toHaveBeenCalled();
  });
});
