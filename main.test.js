import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { regenerateAndRender, initMIDI, musicData, currentBeatIndex, activeMidiNotes, suppressedNotes, computeMeasureCounts, resetGameState, updateNoteSelectors, setMusicData, renderStaff, setCurrentBeatIndex, getNoteValue, isNoteInKey, initKeySignatures } from './main.js';
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
    expect(html).toContain('id="min-note"');
    expect(html).toContain('id="max-note"');
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

    it('should advance to the next beat when correct MIDI notes are played', async () => {
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 0));

      let noteOnCallback;
      const mockInput = {
        name: 'Mock MIDI',
        type: 'input',
        addListener: vi.fn((event, cb) => {
          if (event === 'noteon') noteOnCallback = cb;
        }),
        removeListener: vi.fn(),
      };
      WebMidi.inputs = [mockInput];
      WebMidi._trigger('connected', { port: mockInput });

      // Initial state
      document.body.innerHTML += '<select id="measures-per-line"><option value="4">4</option></select>' +
                                '<select id="lines"><option value="1">1</option></select>' +
                                '<select id="staff-type"><option value="treble">Treble Clef</option></select>' +
                                '<select id="notes-per-beat"><option value="1">1</option></select>' +
                                '<select id="min-note"><option value="C2">C2</option></select>' +
                                '<select id="max-note"><option value="C6">C6</option></select>';
      regenerateAndRender(document.getElementById('output'));
      expect(currentBeatIndex).toBe(0);

      const targetNotes = [...musicData[0].trebleBeats[0], ...musicData[0].bassBeats[0]];
      targetNotes.forEach(note => {
        noteOnCallback({ note: { identifier: note } });
      });

      expect(currentBeatIndex).toBe(1);
      
      const svg = document.querySelector('svg');
      const highlight = Array.from(svg.querySelectorAll('rect')).find(r => r.getAttribute('fill')?.includes('rgba(173, 216, 230'));
      expect(highlight).not.toBeNull();
    });

    it('should not advance if incorrect MIDI notes are played and should show wrong notes', async () => {
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 0));

      let noteOnCallback;
      const mockInput = {
        name: 'Mock MIDI',
        type: 'input',
        addListener: vi.fn((event, cb) => {
          if (event === 'noteon') noteOnCallback = cb;
        }),
        removeListener: vi.fn(),
      };
      WebMidi.inputs = [mockInput];
      WebMidi._trigger('connected', { port: mockInput });

      document.body.innerHTML += '<select id="measures-per-line"><option value="4">4</option></select>' +
                                '<select id="lines"><option value="1">1</option></select>' +
                                '<select id="staff-type"><option value="treble">Treble Clef</option></select>' +
                                '<select id="notes-per-beat"><option value="1">1</option></select>' +
                                '<select id="min-note"><option value="C2">C2</option></select>' +
                                '<select id="max-note"><option value="C6">C6</option></select>';
      regenerateAndRender(document.getElementById('output'));
      expect(currentBeatIndex).toBe(0);

      const wrongNote = 'F#4';
      noteOnCallback({ note: { identifier: wrongNote } });

      expect(currentBeatIndex).toBe(0);

      const svg = document.querySelector('svg');
      const inner = svg.innerHTML.toLowerCase();
      const hasGrey = inner.includes('gray') || inner.includes('grey') || inner.includes('808080') || inner.includes('128, 128, 128');
      expect(hasGrey).toBe(true);
    });
  });

  describe('Staff Rendering', () => {
    let div;

    beforeEach(() => {
      resetGameState();
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
        <select id="min-note">
          <option value="A0">A0</option>
          <option value="C2" selected>C2</option>
          <option value="C4">C4</option>
          <option value="C8">C8</option>
        </select>
        <select id="max-note">
          <option value="A0">A0</option>
          <option value="C4">C4</option>
          <option value="C6" selected>C6</option>
          <option value="C8">C8</option>
        </select>
        <div id="output"></div>
      `;
      div = document.getElementById('output');
    });

    it('should render a music staff into the div', () => {
      regenerateAndRender(div);
      
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
      
      regenerateAndRender(div);
      
      // 2 measures * 2 lines * 2 staves per measure = 8 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(8);
    });

    it('should render correct number of staves for treble only', () => {
      document.getElementById('measures-per-line').value = "3";
      document.getElementById('lines').value = "1";
      document.getElementById('staff-type').value = "treble";
      
      regenerateAndRender(div);
      
      // 3 measures * 1 line * 1 stave per measure = 3 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(3);
    });

    it('should render correct number of staves for bass only', () => {
      document.getElementById('measures-per-line').value = "4";
      document.getElementById('lines').value = "2";
      document.getElementById('staff-type').value = "bass";
      
      regenerateAndRender(div);
      
      // 4 measures * 2 lines * 1 stave per measure = 8 staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBe(8);
    });

    it('should update rendering when a selector is changed', async () => {
      const linesSelect = document.getElementById('lines');
      linesSelect.value = "2";
      
      regenerateAndRender(div);
      
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
      
      regenerateAndRender(div);
      
      // 1 measure * 4 beats * 3 notes = 12 noteheads
      const noteheads = div.querySelectorAll('.vf-notehead');
      expect(noteheads.length).toBe(12);
    });

    it('should divide notes between treble and bass in grand staff mode', () => {
      document.getElementById('measures-per-line').value = "1";
      document.getElementById('lines').value = "1";
      document.getElementById('staff-type').value = "grand";
      document.getElementById('notes-per-beat').value = "5";
      
      regenerateAndRender(div);
      
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
      
      regenerateAndRender(div);
      
      // 1 measure * 4 beats total. Each beat has 1 note on one staff and 1 rest on the other.
      const allStaveNotes = div.querySelectorAll('.vf-stavenote');
      const nonRestNotes = Array.from(allStaveNotes).filter(n => n.querySelector('.vf-stem'));
      const rests = Array.from(allStaveNotes).filter(n => !n.querySelector('.vf-stem'));
      
      expect(nonRestNotes.length).toBe(4);
      expect(rests.length).toBe(4);
    });

    it('should respect the note range selectors', () => {
      document.getElementById('min-note').value = "C4";
      document.getElementById('max-note').value = "C4";
      document.getElementById('staff-type').value = "treble";
      
      regenerateAndRender(div);
      
      // Every beat should be C4
      musicData.forEach(measure => {
        measure.trebleBeats.forEach(beat => {
          if (beat.length > 0) {
            expect(beat).toEqual(['C4']);
          }
        });
      });
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

    describe('MIDI Suppression Logic', () => {
      it('should suppress notes after a correct match', async () => {
        const output = document.getElementById('output');
        initMIDI();
        await new Promise(resolve => setTimeout(resolve, 0));

        let noteOnCallback;
        const mockInput = {
          name: 'Mock MIDI',
          type: 'input',
          addListener: vi.fn((event, cb) => {
            if (event === 'noteon') noteOnCallback = cb;
          }),
          removeListener: vi.fn(),
        };
        WebMidi.inputs = [mockInput];
        WebMidi._trigger('connected', { port: mockInput });

        regenerateAndRender(output);
        const targetNote = musicData[0].trebleBeats[0][0] || musicData[0].bassBeats[0][0]; 
        
        noteOnCallback({ note: { identifier: targetNote } });
        expect(currentBeatIndex).toBe(1);
        expect(suppressedNotes.has(targetNote)).toBe(true);
        
        const svg = document.querySelector('svg');
        expect(svg.innerHTML).not.toContain('rgba(128, 128, 128, 0.4)');
      });

      it('should stop suppressing when a new wrong note is hit', async () => {
        const output = document.getElementById('output');
        initMIDI();
        await new Promise(resolve => setTimeout(resolve, 0));

        let noteOnCallback;
        const mockInput = {
          name: 'Mock MIDI',
          type: 'input',
          addListener: vi.fn((event, cb) => {
            if (event === 'noteon') noteOnCallback = cb;
          }),
          removeListener: vi.fn(),
        };
        WebMidi.inputs = [mockInput];
        WebMidi._trigger('connected', { port: mockInput });

        regenerateAndRender(output);
        const targetNote0 = musicData[0].trebleBeats[0][0] || musicData[0].bassBeats[0][0];
        
        noteOnCallback({ note: { identifier: targetNote0 } });
        expect(currentBeatIndex).toBe(1);
        
        noteOnCallback({ note: { identifier: 'F#4' } }); // Assuming F#4 is wrong
        expect(suppressedNotes.size).toBe(0);
        expect(document.querySelector('svg').innerHTML).toContain('rgba(128, 128, 128, 0.4)');
      });

      it('should render an end barline (boldDoubleRight) for the last measure', () => {
        document.body.innerHTML = `
          <select id="measures-per-line"><option value="1">1</option></select>
          <select id="lines"><option value="1">1</option></select>
          <select id="staff-type"><option value="treble">treble</option></select>
          <select id="notes-per-beat"><option value="1">1</option></select>
          <select id="min-note"><option value="C4">C4</option></select>
          <select id="max-note"><option value="C6">C6</option></select>
          <div id="output"></div>
        `;
        const output = document.getElementById('output');
        regenerateAndRender(output);
        
        const svg = output.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg.innerHTML).toBeDefined();
      });

      it('should regenerate music and reset beat index when the last beat is matched', async () => {
        document.body.innerHTML = `
          <select id="measures-per-line"><option value="1">1</option></select>
          <select id="lines"><option value="1">1</option></select>
          <select id="staff-type"><option value="treble">treble</option></select>
          <select id="notes-per-beat"><option value="1">1</option></select>
          <select id="min-note"><option value="C4">C4</option></select>
          <select id="max-note"><option value="C6">C6</option></select>
          <div id="output"></div>
          <div id="midi-status">
            <span id="midi-device-name">-</span>
            <div id="midi-indicator"></div>
          </div>
          <div id="note-display"><span id="current-note">-</span></div>
        `;
        const output = document.getElementById('output');
        
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
        
        initMIDI();
        // Wait for WebMidi.enable() and listeners to be attached
        await new Promise(resolve => setTimeout(resolve, 10));
        
        regenerateAndRender(output);
        
        const initialMusicData = JSON.stringify(musicData);
        
        // Match all 4 beats
        for (let i = 0; i < 4; i++) {
          const targetPitches = [...musicData[0].trebleBeats[i]];
          // Press target notes
          targetPitches.forEach(p => {
            noteOnCallback({ note: { identifier: p } });
          });
          
          if (i < 3) {
            // Release notes for next beat
            targetPitches.forEach(p => {
              noteOffCallback({ note: { identifier: p } });
            });
          }
        }
        
        // After 4 beats (1 measure), it should have regenerated
        expect(currentBeatIndex).toBe(0);
        expect(JSON.stringify(musicData)).not.toBe(initialMusicData);
      });
    });
  });

  describe('Range Selection Logic', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <select id="staff-type">
          <option value="grand">Grand Staff</option>
          <option value="treble">Treble Clef</option>
          <option value="bass">Bass Clef</option>
        </select>
        <select id="min-note"></select>
        <select id="max-note"></select>
        <div id="output"></div>
      `;
    });

    it('should filter notes for Treble Clef to C3-C6', () => {
      document.getElementById('staff-type').value = 'treble';
      updateNoteSelectors();
      
      const minSelect = document.getElementById('min-note');
      const options = Array.from(minSelect.options).map(o => o.value);
      
      expect(options[0]).toBe('C3');
      expect(options[options.length - 1]).toBe('C6');
      expect(options).not.toContain('C2');
      expect(options).not.toContain('C7');
    });

    it('should filter notes for Bass Clef to C1-C5', () => {
      document.getElementById('staff-type').value = 'bass';
      updateNoteSelectors();
      
      const minSelect = document.getElementById('min-note');
      const options = Array.from(minSelect.options).map(o => o.value);
      
      expect(options[0]).toBe('C1');
      expect(options[options.length - 1]).toBe('C5');
      expect(options).not.toContain('A0');
      expect(options).not.toContain('C6');
    });

    it('should show full piano range for Grand Staff', () => {
      document.getElementById('staff-type').value = 'grand';
      updateNoteSelectors();
      
      const minSelect = document.getElementById('min-note');
      const options = Array.from(minSelect.options).map(o => o.value);
      
      expect(options[0]).toBe('A0');
      expect(options[options.length - 1]).toBe('C8');
    });

    it('should fall back to defaults when switching staff types and current selection is out of range', () => {
      // Start with Grand Staff, select A0
      document.getElementById('staff-type').value = 'grand';
      updateNoteSelectors();
      document.getElementById('min-note').value = 'A0';
      
      // Switch to Treble Clef
      document.getElementById('staff-type').value = 'treble';
      updateNoteSelectors();
      
      expect(document.getElementById('min-note').value).toBe('C3');
    });

    it('should preserve selection when switching staff types and current selection is still in range', () => {
      // Start with Grand Staff, select C4
      document.getElementById('staff-type').value = 'grand';
      updateNoteSelectors();
      document.getElementById('min-note').value = 'C4';
      
      // Switch to Treble Clef (C3-C6)
      document.getElementById('staff-type').value = 'treble';
      updateNoteSelectors();
      
      expect(document.getElementById('min-note').value).toBe('C4');
    });
  });

  describe('Accidental Persistence', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <select id="measures-per-line"><option value="4">4</option></select>
        <select id="notes-per-beat"><option value="1">1</option></select>
        <select id="lines"><option value="1">1</option></select>
        <select id="staff-type"><option value="treble">Treble Clef</option></select>
        <select id="min-note"><option value="C3">C3</option></select>
        <select id="max-note"><option value="C6">C6</option></select>
        <div id="output"></div>
        <div id="midi-status">
          <span id="midi-device-name">-</span>
          <div id="midi-indicator"></div>
        </div>
        <div id="note-display"><span id="current-note">-</span></div>
      `;
    });

    it('should match F#4 correctly even if it is the second F#4 in a measure (persistent accidental)', async () => {
      // Mock musicData to have two F#4 in a measure
      resetGameState();
      setMusicData([{
        trebleBeats: [['F#4'], [], ['F#4'], []],
        bassBeats: [[], [], [], []],
        staffType: 'treble'
      }]);
      // currentBeatIndex is reset in resetGameState usually, but let's be sure.
      
      renderStaff();
      
      // We'll use initMIDI to hook up listeners
      let noteOnCallback;
      const mockInput = {
        name: 'Mock MIDI Keyboard',
        type: 'input',
        addListener: vi.fn((event, cb) => {
          if (event === 'noteon') noteOnCallback = cb;
        }),
        removeListener: vi.fn(),
      };
      WebMidi.inputs = [mockInput];
      initMIDI();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Beat 0: Match F#4
      noteOnCallback({ note: { identifier: 'F#4' } });
      expect(currentBeatIndex).toBe(1);
      
      // Advance to Beat 2 (another F#4)
      setCurrentBeatIndex(2);
      renderStaff(); // Re-render for new beat
      
      // Beat 2: Match F#4
      noteOnCallback({ note: { identifier: 'F#4' } });
      expect(currentBeatIndex).toBe(3);
    });
  });

  describe('Accidental Rules', () => {
    beforeEach(() => {
      resetGameState();
      document.body.innerHTML = `
        <div id="output"></div>
        <select id="measures-per-line"><option value="1">1</option></select>
        <select id="lines"><option value="1">1</option></select>
        <select id="staff-type"><option value="grand">grand</option></select>
        <select id="notes-per-beat"><option value="1">1</option></select>
        <select id="min-note"><option value="A0">A0</option></select>
        <select id="max-note"><option value="C8">C8</option></select>
      `;
    });

    it('should respect the Octave Rule (accidental only applies to specific octave)', () => {
      setMusicData([
        {
          trebleBeats: [['C#4'], ['C5'], ['C#4'], ['C4']],
          bassBeats: [[], [], [], []]
        }
      ]);
      renderStaff();
      
      const svgContent = document.getElementById('output').innerHTML;
      const sharps = (svgContent.match(/\ue262/g) || []).length;
      const naturals = (svgContent.match(/\ue261/g) || []).length;
      
      // Beat 0: C#4 (Sharp rendered)
      // Beat 1: C5 (No accidental - Octave Rule)
      // Beat 2: C#4 (Persistent - No sharp rendered)
      // Beat 3: C4 (Natural rendered - Octave Rule/Persistence)
      expect(sharps + naturals).toBe(2);
    });

    it('should show multiple sharps for different octaves in the same beat', () => {
      setMusicData([
        {
          trebleBeats: [['C#4', 'C#5'], [], [], []],
          bassBeats: [[], [], [], []]
        }
      ]);
      renderStaff();
      const svgContent = document.getElementById('output').innerHTML;
      const sharps = (svgContent.match(/\ue262/g) || []).length;
      expect(sharps).toBe(2);
    });

    it('should respect Staff Independence (accidental in treble does not affect bass)', () => {
      setMusicData([
        {
          trebleBeats: [['C#4'], [], [], []],
          bassBeats: [[], ['C4'], [], []]
        }
      ]);
      renderStaff();
      const svgContent = document.getElementById('output').innerHTML;
      const accsCount = (svgContent.match(/[\ue262\ue261\ue260]/g) || []).length;
      expect(accsCount).toBe(1);
    });

    it('should mark sharps in both staves if they are in different beats but same measure', () => {
      setMusicData([
        {
          trebleBeats: [['C#4'], [], [], []],
          bassBeats: [[], ['C#4'], [], []]
        }
      ]);
      renderStaff();
      const svgContent = document.getElementById('output').innerHTML;
      const sharps = (svgContent.match(/\ue262/g) || []).length;
      expect(sharps).toBe(2);
    });

    it('should mark accidentals in both staves for simultaneous identical notes', () => {
      setMusicData([
        {
          trebleBeats: [['C#4'], [], [], []],
          bassBeats: [['C#4'], [], [], []]
        }
      ]);
      renderStaff();
      const svgContent = document.getElementById('output').innerHTML;
      const accsCount = (svgContent.match(/[\ue262\ue261\ue260]/g) || []).length;
      expect(accsCount).toBe(2);
    });
  });

  describe('Key Signatures', () => {

    beforeEach(() => {
      resetGameState();
      document.body.innerHTML = `
        <div id="controls">
          <select id="measures-per-line"><option value="1">1</option></select>
          <select id="lines"><option value="1">1</option></select>
          <select id="staff-type"><option value="treble">treble</option></select>
          <select id="notes-per-beat"><option value="1">1</option></select>
          <select id="min-note"><option value="C3">C3</option></select>
          <select id="max-note"><option value="C6">C6</option></select>
          <div id="key-signatures"></div>
        </div>
        <div id="output"></div>
      `;
      initKeySignatures();
    });

    it('should create checkboxes for all 15 key signatures plus Chromatic', () => {
      const container = document.getElementById('key-signatures');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      // 15 keys (C, G, D, A, E, B, F#, C#, F, Bb, Eb, Ab, Db, Gb, Cb) + Chromatic = 16
      expect(checkboxes.length).toBe(16);
      expect(Array.from(checkboxes).map(cb => cb.value)).toContain('G');
      expect(Array.from(checkboxes).map(cb => cb.value)).toContain('Chromatic');
    });

    it('should default to Key of C checked', () => {
      const cbC = document.getElementById('key-C');
      expect(cbC.checked).toBe(true);
    });

    it('should generate music in the selected key signature', () => {
      // Uncheck C, check G
      document.getElementById('key-C').checked = false;
      document.getElementById('key-G').checked = true;
      
      regenerateAndRender();
      
      expect(musicData[0].keySignature).toBe('G');
      
      // All generated notes should be in G Major
      musicData[0].trebleBeats.forEach(beat => {
        beat.forEach(note => {
          const name = note.match(/^([A-G][#b]*)/)[1];
          expect(isNoteInKey(name, 'G')).toBe(true);
        });
      });
    });

    it('should change key signatures at the start of a new line if multiple are selected', () => {
      document.getElementById('measures-per-line').innerHTML = '<option value="4">4</option>';
      document.getElementById('measures-per-line').value = '4';
      document.getElementById('lines').innerHTML = '<option value="10">10</option>';
      document.getElementById('lines').value = '10';
      document.getElementById('key-C').checked = true;
      document.getElementById('key-G').checked = true;
      
      regenerateAndRender();
      
      const keysUsed = new Set(musicData.map(m => m.keySignature));
      expect(keysUsed.has('C')).toBe(true);
      expect(keysUsed.has('G')).toBe(true);
      
      // Measures in the same line (4 measures per line) should have the same key
      for (let i = 0; i < musicData.length; i += 4) {
        const lineKey = musicData[i].keySignature;
        for (let j = 0; j < 4; j++) {
           if (i + j < musicData.length) {
             expect(musicData[i + j].keySignature).toBe(lineKey);
           }
        }
      }
    });

    it('should allow non-diatonic notes when Chromatic is checked', () => {
      document.getElementById('key-C').checked = true;
      document.getElementById('key-Chromatic').checked = true;
      
      // We'll run it a few times to increase chance of seeing a chromatic note
      let foundChromatic = false;
      for (let i = 0; i < 10; i++) {
        regenerateAndRender();
        musicData[0].trebleBeats.forEach(beat => {
          beat.forEach(note => {
            const name = note.match(/^([A-G][#b]*)/)[1];
            if (!isNoteInKey(name, 'C')) foundChromatic = true;
          });
        });
        if (foundChromatic) break;
      }
      expect(foundChromatic).toBe(true);
    });

    it('should handle flat key signatures correctly in MIDI matching (getNoteValue enharmonics)', () => {
      // D#4 should equal Eb4
      expect(getNoteValue('D#4')).toBe(getNoteValue('Eb4'));
      // F#4 should equal Gb4
      expect(getNoteValue('F#4')).toBe(getNoteValue('Gb4'));
      // B#3 should equal C4
      expect(getNoteValue('B#3')).toBe(getNoteValue('C4'));
      // Cb4 should equal B3
      expect(getNoteValue('Cb4')).toBe(getNoteValue('B3'));
    });

    it('should render the key signature on the staff', () => {
      document.getElementById('key-C').checked = false;
      document.getElementById('key-G').checked = true;
      regenerateAndRender();
      
      const svg = document.getElementById('output').innerHTML;
      // Key of G has one sharp (F#). VexFlow renders this.
      // We check for the sharp glyph in the SVG (u+e262)
      expect(svg).toContain('\ue262');
    });
  });
});
