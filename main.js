import { Factory } from 'vexflow';
import { WebMidi } from 'webmidi';

/**
 * Generates random pitches for VexFlow.
 * @param {string} clef - 'treble' or 'bass'
 * @param {number} count - number of unique pitches
 * @returns {string[]}
 */
function getRandomPitches(clef, count) {
  const trebleNotes = [
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 
    'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 
    'C6'
  ];
  const bassNotes = [
    'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'
  ];
  const options = [...(clef === 'treble' ? trebleNotes : bassNotes)];
  
  const selected = [];
  for (let i = 0; i < count; i++) {
    if (options.length === 0) break;
    const idx = Math.floor(Math.random() * options.length);
    selected.push(options.splice(idx, 1)[0]);
  }

  // Sort pitches for VexFlow chords
  const order = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
  return selected.sort((a, b) => {
    const octaveA = parseInt(a[a.length - 1]);
    const octaveB = parseInt(b[b.length - 1]);
    if (octaveA !== octaveB) return octaveA - octaveB;
    return order[a[0]] - order[b[0]];
  });
}

/**
 * Generates a string of 4 random quarter beats (single notes or chords).
 * @param {string} clef - 'treble' or 'bass'
 * @param {number|number[]} noteCounts - number of notes per beat (or array of 4 counts)
 * @returns {string}
 */
function getRandomMeasureNotes(clef = 'treble', noteCounts = 1) {
  const beats = [];
  const restPitch = clef === 'treble' ? 'B4' : 'D3';
  const counts = Array.isArray(noteCounts) ? noteCounts : Array(4).fill(noteCounts);
  for (let b = 0; b < 4; b++) {
    const count = counts[b];
    if (count === 0) {
      // Use rests for empty beats.
      beats.push(`${restPitch}/q/r`);
    } else {
      const pitches = getRandomPitches(clef, count);
      if (count > 1) {
        beats.push(`(${pitches.join(' ')})/q`);
      } else {
        beats.push(`${pitches[0]}/q`);
      }
    }
  }
  return beats.join(', ');
}

/**
 * Compute per-beat note distribution for a single measure.
 * - For 'treble' or 'bass', all beats go to the selected staff.
 * - For 'grand' with notesPerBeat = 1, put notes on bass only (deterministic).
 * - For 'grand' with notesPerBeat > 1, split ceil/floor between treble/bass.
 * @param {string} staffType
 * @param {number} notesPerBeat
 * @param {number} measureIndex
 * @returns {{trebleCounts:number[], bassCounts:number[]}}
 */
export function computeMeasureCounts(staffType, notesPerBeat, measureIndex = 0) {
  const trebleCounts = [];
  const bassCounts = [];
  for (let b = 0; b < 4; b++) {
    if (staffType === 'treble') {
      trebleCounts.push(notesPerBeat);
      bassCounts.push(0);
    } else if (staffType === 'bass') {
      trebleCounts.push(0);
      bassCounts.push(notesPerBeat);
    } else if (staffType === 'grand') {
      if (notesPerBeat === 1) {
        // Alternate between treble and bass based on measure and beat index.
        if ((b + measureIndex) % 2 === 0) {
          trebleCounts.push(1);
          bassCounts.push(0);
        } else {
          trebleCounts.push(0);
          bassCounts.push(1);
        }
      } else {
        trebleCounts.push(Math.ceil(notesPerBeat / 2));
        bassCounts.push(Math.floor(notesPerBeat / 2));
      }
    }
  }
  return { trebleCounts, bassCounts };
}

/**
 * Renders the music staff based on current selector values.
 * @param {HTMLElement} [outputDiv] - Optional div to render into.
 */
export function renderStaff(outputDiv) {
  const div = outputDiv || document.getElementById('output');
  if (!div) return;
  
  // Clear previous content
  div.innerHTML = '';
  
  const measuresPerLine = parseInt(document.getElementById('measures-per-line')?.value || '4');
  const notesPerBeat = parseInt(document.getElementById('notes-per-beat')?.value || '1');
  const linesCount = parseInt(document.getElementById('lines')?.value || '1');
  const staffType = document.getElementById('staff-type')?.value || 'grand';

  // Ensure the div has an ID
  if (!div.id) {
    div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);
  }
  
  const widthPerMeasure = 200;
  const padding = 100;
  const totalWidth = (measuresPerLine * widthPerMeasure) + padding;
  const heightPerLine = staffType === 'grand' ? 250 : 150;
  const totalHeight = (linesCount * heightPerLine) + 100;

  const vf = new Factory({ 
    renderer: { 
      elementId: div.id, 
      width: totalWidth, 
      height: totalHeight 
    } 
  });
  
  const score = vf.EasyScore();
  
  for (let l = 0; l < linesCount; l++) {
    const y = 50 + (l * heightPerLine);
    
    for (let m = 0; m < measuresPerLine; m++) {
      const x = 50 + (m * widthPerMeasure);
      const system = vf.System({ x, y, width: widthPerMeasure });
      
      const { trebleCounts, bassCounts } = computeMeasureCounts(staffType, notesPerBeat, m);
      
      if (staffType === 'treble' || staffType === 'grand') {
        const notes = getRandomMeasureNotes('treble', trebleCounts);
        const stave = system.addStave({
          voices: [score.voice(score.notes(notes, { stem: 'up' }))],
        });
        if (m === 0) stave.addClef('treble').addTimeSignature('4/4');
      }
      
      if (staffType === 'bass' || staffType === 'grand') {
        const notes = getRandomMeasureNotes('bass', bassCounts);
        const stave = system.addStave({
          voices: [score.voice(score.notes(notes, { clef: 'bass', stem: 'down' }))],
        });
        if (m === 0) stave.addClef('bass').addTimeSignature('4/4');
      }
      
      if (staffType === 'grand') {
        if (m === 0) system.addConnector('brace');
        system.addConnector('singleRight');
      }
      
      if (m === 0) {
        system.addConnector('singleLeft');
      }
      
      if (m === measuresPerLine - 1 && staffType !== 'grand') {
        system.addConnector('singleRight');
      }
    }
  }
  
  vf.draw();
}

/**
 * Initializes MIDI detection.
 */
export function initMIDI() {
  const deviceNameEl = document.getElementById('midi-device-name');
  const indicatorEl = document.getElementById('midi-indicator');
  const noteDisplayEl = document.getElementById('current-note');

  if (!deviceNameEl || !indicatorEl || !noteDisplayEl) return;

  const updateStatus = () => {
    if (WebMidi.inputs.length > 0) {
      deviceNameEl.textContent = WebMidi.inputs[0].name;
      indicatorEl.style.backgroundColor = 'green';
    } else {
      deviceNameEl.textContent = 'No device connected';
      indicatorEl.style.backgroundColor = 'red';
    }
  };

  const activeNotes = new Set();

  const onNoteOn = (e) => {
    activeNotes.add(e.note.identifier);
    noteDisplayEl.textContent = Array.from(activeNotes).join(', ');
  };

  const onNoteOff = (e) => {
    activeNotes.delete(e.note.identifier);
    if (activeNotes.size === 0) {
      noteDisplayEl.textContent = '-';
    } else {
      noteDisplayEl.textContent = Array.from(activeNotes).join(', ');
    }
  };

  const addInputListeners = (input) => {
    input.removeListener('noteon');
    input.removeListener('noteoff');
    input.addListener('noteon', onNoteOn);
    input.addListener('noteoff', onNoteOff);
  };

  WebMidi.enable().then(() => {
    updateStatus();
    
    WebMidi.inputs.forEach(addInputListeners);

    WebMidi.addListener('connected', (e) => {
      if (e.port.type === 'input') {
        addInputListeners(e.port);
      }
      updateStatus();
    });

    WebMidi.addListener('disconnected', () => {
      updateStatus();
    });
  }).catch(err => {
    console.error('MIDI could not be enabled:', err);
    deviceNameEl.textContent = 'MIDI Error: ' + err.message;
  });
}

// Automatically initialize if we're in a browser environment.
if (typeof document !== 'undefined') {
  const selectors = ['measures-per-line', 'notes-per-beat', 'lines', 'staff-type'];
  selectors.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => renderStaff());
  });
  
  renderStaff();
  initMIDI();
}
