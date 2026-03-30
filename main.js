import { Factory } from 'vexflow';
import { WebMidi } from 'webmidi';

/**
 * Generates a random note identifier for VexFlow.
 * @param {string} clef - 'treble' or 'bass'
 * @returns {string}
 */
function getRandomNote(clef = 'treble') {
  const trebleNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
  const bassNotes = ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3'];
  const options = clef === 'treble' ? trebleNotes : bassNotes;
  return options[Math.floor(Math.random() * options.length)] + '/q';
}

/**
 * Generates a string of 4 random quarter notes.
 * @param {string} clef - 'treble' or 'bass'
 * @returns {string}
 */
function getRandomMeasureNotes(clef = 'treble') {
  return [
    getRandomNote(clef),
    getRandomNote(clef),
    getRandomNote(clef),
    getRandomNote(clef)
  ].join(', ');
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
      
      if (staffType === 'treble' || staffType === 'grand') {
        const notes = getRandomMeasureNotes('treble');
        const stave = system.addStave({
          voices: [score.voice(score.notes(notes, { stem: 'up' }))],
        });
        if (m === 0) stave.addClef('treble').addTimeSignature('4/4');
      }
      
      if (staffType === 'bass' || staffType === 'grand') {
        const notes = getRandomMeasureNotes('bass');
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
  const selectors = ['measures-per-line', 'lines', 'staff-type'];
  selectors.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => renderStaff());
  });
  
  renderStaff();
  initMIDI();
}
