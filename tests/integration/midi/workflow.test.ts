import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initMidiHandler, checkMatch, activeMidiNotes, resetGameState, currentStepIndex, setMusicData } from '@/main';
import { WebMidi } from 'webmidi';
import type { Input, NoteMessageEvent } from 'webmidi';

interface MockWebMidiShape {
  inputs: Input[];
  _trigger: (event: string, data: unknown) => void;
}

// Mock WebMidi
vi.mock('webmidi', () => {
  const listeners: Record<string, (data: unknown) => void> = {};
  return {
    WebMidi: {
      enable: vi.fn().mockResolvedValue(true),
      inputs: [],
      addListener: vi.fn((event: string, callback: (data: unknown) => void) => {
        listeners[event] = callback;
      }),
      removeListener: vi.fn(),
      _trigger: (event: string, data: unknown) => {
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
    (WebMidi as unknown as MockWebMidiShape).inputs = [];
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
    (WebMidi as unknown as MockWebMidiShape).inputs = [mockInput as unknown as Input];
    
    (WebMidi as unknown as MockWebMidiShape)._trigger('connected', { port: mockInput });

    const deviceName = document.getElementById('midi-device-name')!;
    const indicator = document.getElementById('midi-indicator')!;

    expect(deviceName.textContent).toBe('Mock MIDI Keyboard');
    expect(indicator.style.backgroundColor).toBe('green');
  });

  it('should handle note on and off events', async () => {
    initMidiHandler();
    await new Promise(resolve => setTimeout(resolve, 0));

    let noteOnCallback: ((event: NoteMessageEvent) => void) | undefined;
    let noteOffCallback: ((event: NoteMessageEvent) => void) | undefined;
    const mockInput = {
      name: 'Mock MIDI Keyboard',
      type: 'input',
      addListener: vi.fn((event: string, callback: (event: NoteMessageEvent) => void) => {
        if (event === 'noteon') noteOnCallback = callback;
        if (event === 'noteoff') noteOffCallback = callback;
      }),
      removeListener: vi.fn(),
    };
    (WebMidi as unknown as MockWebMidiShape).inputs = [mockInput as unknown as Input];
    (WebMidi as unknown as MockWebMidiShape)._trigger('connected', { port: mockInput });

    const noteDisplay = document.getElementById('current-note')!;

    // Note On
    noteOnCallback?.({ note: { identifier: 'C4' } } as NoteMessageEvent);
    expect(noteDisplay.textContent).toBe('C4');
    expect(activeMidiNotes.has('C4')).toBe(true);

    // Another Note On
    noteOnCallback?.({ note: { identifier: 'E4' } } as NoteMessageEvent);
    expect(noteDisplay.textContent).toBe('C4, E4');

    // Note Off
    noteOffCallback?.({ note: { identifier: 'C4' } } as NoteMessageEvent);
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
