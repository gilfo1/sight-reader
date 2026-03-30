import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { renderStaff, initMIDI } from './main.js';
import { WebMidi } from 'webmidi';

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

describe('Music Staff Project', () => {
  it('should have an index.html with MIDI container elements', () => {
    const html = readFileSync('./index.html', 'utf-8');
    expect(html).toContain('id="midi-status"');
    expect(html).toContain('id="midi-device-name"');
    expect(html).toContain('id="midi-indicator"');
    expect(html).toContain('id="note-display"');
    expect(html).toContain('id="current-note"');
  });

  it('should have a main.js file that exports renderStaff and initMIDI', async () => {
    const main = await import('./main.js');
    expect(main.renderStaff).toBeDefined();
    expect(main.initMIDI).toBeDefined();
  });

  it('should include webmidi dependency in package.json', () => {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    expect(pkg.dependencies.webmidi).toBeDefined();
  });

  describe('MIDI Functionality', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="midi-status">
          <span id="midi-device-name">No device connected</span>
          <div id="midi-indicator" style="background-color: gray;"></div>
        </div>
        <div id="note-display">
          <span id="current-note">-</span>
        </div>
        <div id="output"></div>
      `;
      vi.clearAllMocks();
      WebMidi.inputs = [];
    });

    it('should initialize MIDI and update status when a device is connected', async () => {
      initMIDI();
      
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
      WebMidi.inputs = [mockInput];
      
      // Trigger the "connected" event
      WebMidi._trigger('connected', { port: mockInput });

      const deviceName = document.getElementById('midi-device-name');
      const indicator = document.getElementById('midi-indicator');

      expect(deviceName.textContent).toBe('Mock MIDI Keyboard');
      expect(indicator.style.backgroundColor).toBe('green');
    });

    it('should display the note name when a noteon event is received', async () => {
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 0));

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
      
      WebMidi._trigger('connected', { port: mockInput });

      const noteDisplay = document.getElementById('current-note');

      // Simulate first note
      if (noteOnCallback) {
        noteOnCallback({ note: { identifier: 'C4' } });
      }
      expect(noteDisplay.textContent).toBe('C4');

      // Simulate second note
      if (noteOnCallback) {
        noteOnCallback({ note: { identifier: 'E4' } });
      }
      expect(noteDisplay.textContent).toBe('C4, E4');

      // Release first note
      if (noteOffCallback) {
        noteOffCallback({ note: { identifier: 'C4' } });
      }
      expect(noteDisplay.textContent).toBe('E4');

      // Release second note
      if (noteOffCallback) {
        noteOffCallback({ note: { identifier: 'E4' } });
      }
      expect(noteDisplay.textContent).toBe('-');
    });
  });

  describe('Staff Rendering', () => {
    let div;

    beforeEach(() => {
      document.body.innerHTML = '<div id="output"></div>';
      div = document.getElementById('output');
    });

    it('should render a music staff into the div', () => {
      renderStaff(div);
      
      const svg = div.querySelector('svg');
      expect(svg).not.toBeNull();
      
      // Check for staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBeGreaterThanOrEqual(2);

      // Check for clefs (treble and bass)
      const clefs = div.querySelectorAll('.vf-clef');
      expect(clefs.length).toBeGreaterThanOrEqual(2);

      // Check for notes
      const notes = div.querySelectorAll('.vf-stavenote');
      expect(notes.length).toBeGreaterThan(0);
    });
  });
});
