import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { renderStaff, initMIDI, computeMeasureCounts } from './main.js';
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
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
  });

  it('should have an index.html with music configuration selectors', () => {
    const html = readFileSync('./index.html', 'utf-8');
    expect(html).toContain('id="measures-per-line"');
    expect(html).toContain('id="notes-per-beat"');
    expect(html).toContain('id="lines"');
    expect(html).toContain('id="staff-type"');
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

    it('should show a red indicator when no device is connected', async () => {
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const indicator = document.getElementById('midi-indicator');
      expect(indicator.style.backgroundColor).toBe('red');
    });

    it('should turn the indicator back to red when a device is disconnected', async () => {
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const indicator = document.getElementById('midi-indicator');
      const deviceName = document.getElementById('midi-device-name');

      // Connect
      const mockInput = {
        name: 'Mock MIDI Keyboard',
        type: 'input',
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
      WebMidi.inputs = [mockInput];
      WebMidi._trigger('connected', { port: mockInput });
      expect(indicator.style.backgroundColor).toBe('green');

      // Disconnect
      WebMidi.inputs = [];
      WebMidi._trigger('disconnected', { port: mockInput });
      expect(indicator.style.backgroundColor).toBe('red');
      expect(deviceName.textContent).toBe('No device connected');
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
      document.body.innerHTML = `
        <select id="measures-per-line">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4" selected>4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
        </select>
        <select id="notes-per-beat">
          <option value="1" selected>1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
        <select id="lines">
          <option value="1" selected>1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
        <select id="staff-type">
          <option value="grand" selected>Grand Staff</option>
          <option value="treble">Treble Clef</option>
          <option value="bass">Bass Clef</option>
        </select>
        <div id="output"></div>
      `;
      div = document.getElementById('output');
    });

    it('should render a music staff into the div', () => {
      renderStaff(div);
      
      const svg = div.querySelector('svg');
      expect(svg).not.toBeNull();
      
      // Default grand staff (4 measures, 1 line) = 8 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(8);

      // Check for clefs
      const clefs = div.querySelectorAll('.vf-clef');
      expect(clefs.length).toBeGreaterThanOrEqual(2);

      // Check for notes
      const notes = div.querySelectorAll('.vf-stavenote');
      expect(notes.length).toBeGreaterThan(0);
    });

    it('should render correct number of staves based on selectors', () => {
      document.getElementById('measures-per-line').value = "2";
      document.getElementById('lines').value = "2";
      document.getElementById('staff-type').value = "grand";
      
      renderStaff(div);
      
      // 2 measures * 2 lines * 2 staves per measure = 8 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(8);
    });

    it('should render correct number of staves for treble only', () => {
      document.getElementById('measures-per-line').value = "3";
      document.getElementById('lines').value = "1";
      document.getElementById('staff-type').value = "treble";
      
      renderStaff(div);
      
      // 3 measures * 1 line * 1 stave per measure = 3 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(3);
    });

    it('should render correct number of staves for bass only', () => {
      document.getElementById('measures-per-line').value = "4";
      document.getElementById('lines').value = "2";
      document.getElementById('staff-type').value = "bass";
      
      renderStaff(div);
      
      // 4 measures * 2 lines * 1 stave per measure = 8 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(8);
    });

    it('should update rendering when a selector is changed', async () => {
      // Mock the auto-initialization listener by manually triggering change
      const linesSelect = document.getElementById('lines');
      linesSelect.value = "2";
      
      const selectors = ['measures-per-line', 'notes-per-beat', 'lines', 'staff-type'];
      selectors.forEach(id => {
        document.getElementById(id).addEventListener('change', () => renderStaff(div));
      });
      
      linesSelect.dispatchEvent(new Event('change'));
      
      // Default was grand staff (4 measures per line)
      // Now 2 lines * 4 measures * 2 staves = 16 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(16);
    });

    it('should render correct number of noteheads for chords', () => {
      document.getElementById('measures-per-line').value = "1";
      document.getElementById('lines').value = "1";
      document.getElementById('staff-type').value = "treble";
      document.getElementById('notes-per-beat').value = "3";
      
      renderStaff(div);
      
      // 1 measure * 4 beats * 3 notes = 12 noteheads
      const noteheads = div.querySelectorAll('.vf-notehead');
      expect(noteheads.length).toBe(12);
    });

    it('should divide notes between treble and bass in grand staff mode', () => {
      document.getElementById('measures-per-line').value = "1";
      document.getElementById('lines').value = "1";
      document.getElementById('staff-type').value = "grand";
      document.getElementById('notes-per-beat').value = "5";
      
      renderStaff(div);
      
      // 1 measure * 4 beats * 5 notes = 20 noteheads total
      const noteheads = div.querySelectorAll('.vf-notehead');
      expect(noteheads.length).toBe(20);
      
      const allStaveNotes = div.querySelectorAll('.vf-stavenote');
      const nonRestNotes = Array.from(allStaveNotes).filter(n => n.querySelector('.vf-stem'));
      const rests = Array.from(allStaveNotes).filter(n => !n.querySelector('.vf-stem'));
      
      expect(rests.length).toBe(0);
    });

    it('should render 4 notes and 4 rests total when notes-per-beat is 1 in grand staff mode (one note per beat, alternating staves)', () => {
      document.getElementById('measures-per-line').value = "1";
      document.getElementById('lines').value = "1";
      document.getElementById('staff-type').value = "grand";
      document.getElementById('notes-per-beat').value = "1";
      
      renderStaff(div);
      
      // 1 measure * 4 beats total. Each beat has 1 note on one staff and 1 rest on the other.
      const allStaveNotes = div.querySelectorAll('.vf-stavenote');
      const nonRestNotes = Array.from(allStaveNotes).filter(n => n.querySelector('.vf-stem'));
      const rests = Array.from(allStaveNotes).filter(n => !n.querySelector('.vf-stem'));
      
      expect(nonRestNotes.length).toBe(4);
      expect(rests.length).toBe(4);
    });

    describe('computeMeasureCounts', () => {
      it('should alternate notes between treble and bass for grand staff with notesPerBeat = 1', () => {
        const measure0 = computeMeasureCounts('grand', 1, 0);
        expect(measure0.trebleCounts).toEqual([1, 0, 1, 0]);
        expect(measure0.bassCounts).toEqual([0, 1, 0, 1]);

        const measure1 = computeMeasureCounts('grand', 1, 1);
        expect(measure1.trebleCounts).toEqual([0, 1, 0, 1]);
        expect(measure1.bassCounts).toEqual([1, 0, 1, 0]);
      });

      it('should split notes for grand staff with notesPerBeat > 1', () => {
        const counts = computeMeasureCounts('grand', 3, 0);
        expect(counts.trebleCounts).toEqual([2, 2, 2, 2]);
        expect(counts.bassCounts).toEqual([1, 1, 1, 1]);
      });
    });
  });
});
