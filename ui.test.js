import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { 
  updateNoteSelectors, 
  initKeySignatures, 
  initMIDI, 
  resetGameState, 
  musicData,
  generateMusicData
} from './main.js';
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
      _trigger: (event, data) => {
        if (listeners[event]) listeners[event](data);
      }
    }
  };
});

// Mock Canvas
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    clearRect: vi.fn(),
  });
}

describe('Front-End UI Suite', () => {
  let html;

  beforeEach(() => {
    resetGameState();
    html = readFileSync('./index.html', 'utf-8');
    
    // Parse the HTML to extract body attributes
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    document.body.innerHTML = doc.body.innerHTML;
    // Copy attributes from body
    Array.from(doc.body.attributes).forEach(attr => {
      document.body.setAttribute(attr.name, attr.value);
    });

    // Remove the script tag to avoid auto-initialization during manual setup
    const script = document.querySelector('script[src="/main.js"]');
    if (script) script.remove();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DOM Elements Presence', () => {
    it('should have a centered main container', () => {
      const body = document.body;
      expect(body.style.display).toBe('flex');
      expect(body.style.flexDirection).toBe('column');
      expect(body.style.alignItems).toBe('center');
    });

    it('should have a Settings accordion', () => {
      const details = document.querySelector('details');
      const summary = details.querySelector('summary');
      expect(summary.textContent).toBe('Settings');
      expect(document.getElementById('controls')).not.toBeNull();
    });

    it('should have all musical configuration selectors', () => {
      const ids = [
        'measures-per-line', 'lines', 'staff-type', 
        'notes-per-beat', 'min-note', 'max-note'
      ];
      ids.forEach(id => {
        expect(document.getElementById(id)).not.toBeNull();
      });
    });

    it('should have note value checkboxes with correct labels', () => {
      const container = document.getElementById('note-values');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const values = Array.from(checkboxes).map(cb => cb.value);
      expect(values).toEqual(['w', 'h', 'q', '8', '16']);
      
      const labels = Array.from(container.querySelectorAll('label')).map(l => l.textContent.trim());
      expect(labels).toContain('Whole');
      expect(labels).toContain('Quarter');
    });

    it('should have MIDI status and note display elements', () => {
      expect(document.getElementById('midi-status')).not.toBeNull();
      expect(document.getElementById('midi-device-name')).not.toBeNull();
      expect(document.getElementById('midi-indicator')).not.toBeNull();
      expect(document.getElementById('midi-notes-details')).not.toBeNull();
      expect(document.getElementById('current-note')).not.toBeNull();
    });
  });

  describe('Accordion Functionality', () => {
    it('should be closed by default', () => {
      const settings = document.querySelector('details');
      const midiNotes = document.getElementById('midi-notes-details');
      expect(settings.open).toBe(false);
      expect(midiNotes.open).toBe(false);
    });

    it('should allow toggling the Settings accordion', () => {
      const settings = document.querySelector('details');
      settings.open = true;
      expect(settings.open).toBe(true);
      settings.open = false;
      expect(settings.open).toBe(false);
    });
  });

  describe('Dynamic Selectors and Inputs', () => {
    it('should populate key signature checkboxes on init', () => {
      initKeySignatures();
      const container = document.getElementById('key-signatures');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      // 15 keys (C, G, D, A, E, B, F#, C#, F, Bb, Eb, Ab, Db, Gb, Cb) + Chromatic = 16
      expect(checkboxes.length).toBe(16);
      
      const cKey = document.getElementById('key-C');
      expect(cKey.checked).toBe(true);
      
      const chromatic = document.getElementById('key-Chromatic');
      expect(chromatic).not.toBeNull();
    });

    it('should filter note ranges based on staff type', () => {
      const staffType = document.getElementById('staff-type');
      const minNote = document.getElementById('min-note');
      
      // Treble Clef: range C3-C6, default C3
      staffType.value = 'treble';
      updateNoteSelectors();
      expect(minNote.options[0].value).toBe('C3');
      expect(minNote.value).toBe('C3');
      
      // Select C6 while in treble
      minNote.value = 'C6';
      
      // Bass Clef: range C1-C5, default C1. C6 is out of range.
      staffType.value = 'bass';
      updateNoteSelectors();
      expect(minNote.options[0].value).toBe('C1');
      expect(minNote.value).toBe('C1'); // Should reset to C1 because C6 is out of range
      
      // Grand Staff: range A0-C8, default C2. C1 is in range.
      staffType.value = 'grand';
      updateNoteSelectors();
      expect(minNote.options[0].value).toBe('A0');
      expect(minNote.value).toBe('C1'); // Should keep C1 because it's in range (A0-C8)
    });

    it('should attempt to preserve previous note selection if within new range', () => {
        const staffType = document.getElementById('staff-type');
        const minNote = document.getElementById('min-note');
        
        staffType.value = 'grand';
        updateNoteSelectors();
        minNote.value = 'E4';
        
        staffType.value = 'treble'; // Range C3-C6, E4 is valid
        updateNoteSelectors();
        expect(minNote.value).toBe('E4');
        
        staffType.value = 'bass'; // Range C1-C5, E4 is valid
        updateNoteSelectors();
        expect(minNote.value).toBe('E4');

        staffType.value = 'treble';
        minNote.value = 'C6';
        staffType.value = 'bass'; // Range C1-C5, C6 is INVALID (C5 max)
        updateNoteSelectors();
        expect(minNote.value).toBe('C1'); // Should reset to default
    });
  });

  describe('MIDI UI Feedback', () => {
    it('should show red indicator when no MIDI device is connected', async () => {
      WebMidi.inputs = [];
      initMIDI();
      // Need to wait for WebMidi.enable promise
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const indicator = document.getElementById('midi-indicator');
      expect(indicator.style.backgroundColor).toBe('red');
      
      const name = document.getElementById('midi-device-name');
      expect(name.textContent).toBe('No device connected');
    });

    it('should show green indicator and device name when a device connects', async () => {
      const mockInput = { name: 'Super Keyboard 3000', addListener: vi.fn(), removeListener: vi.fn() };
      WebMidi.inputs = [mockInput];
      
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const indicator = document.getElementById('midi-indicator');
      expect(indicator.style.backgroundColor).toBe('green');
      
      const name = document.getElementById('midi-device-name');
      expect(name.textContent).toBe('Super Keyboard 3000');
    });
  });

  describe('User Interaction and Re-rendering', () => {
    it('should trigger music regeneration when selectors change', () => {
      // Manually attach listeners as main.js does on load
      const selectors = ['measures-per-line', 'notes-per-beat', 'lines', 'staff-type', 'min-note', 'max-note'];
      selectors.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            generateMusicData();
        });
      });

      const measures = document.getElementById('measures-per-line');
      measures.value = '2';
      measures.dispatchEvent(new Event('change'));
      
      expect(musicData.length).toBeGreaterThan(0);
      // If we have 1 line and 2 measures per line, we should have 2 measures total
      expect(musicData.length).toBe(2);
    });

    it('should update current-note display when MIDI notes are pressed', async () => {
      let noteOnCallback;
      const mockInput = { 
          name: 'Keyboard', 
          addListener: vi.fn((event, cb) => {
              if (event === 'noteon') noteOnCallback = cb;
          }),
          removeListener: vi.fn()
      };
      WebMidi.inputs = [mockInput];
      
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      noteOnCallback({ note: { identifier: 'C4' } });
      const display = document.getElementById('current-note');
      expect(display.textContent).toBe('C4');
      
      noteOnCallback({ note: { identifier: 'E4' } });
      expect(display.textContent).toContain('C4');
      expect(display.textContent).toContain('E4');
    });
  });
});
