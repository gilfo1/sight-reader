import { Factory } from 'vexflow';
import { WebMidi } from 'webmidi';

/**
 * Renders a grand staff with some notes.
 * @param {HTMLElement} div - The element where the staff will be rendered.
 */
export function renderStaff(div) {
  if (!div) return;
  
  // Ensure the div has an ID, as VexFlow Factory requires one.
  if (!div.id) {
    div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);
  }
  
  const vf = new Factory({ 
    renderer: { 
      elementId: div.id, 
      width: 600, 
      height: 400 
    } 
  });
  
  const score = vf.EasyScore();
  const system = vf.System({ x: 50, y: 50, width: 500 });

  // Add treble stave
  system.addStave({
    voices: [
      score.voice(score.notes('C4/q, D4/q, E4/q, F4/q', { stem: 'up' })),
    ],
  }).addClef('treble').addTimeSignature('4/4');

  // Add bass stave
  system.addStave({
    voices: [
      score.voice(score.notes('C3/h, G2/h', { clef: 'bass' })),
    ],
  }).addClef('bass').addTimeSignature('4/4');

  // Connect staves
  system.addConnector('brace');
  system.addConnector('singleLeft');
  system.addConnector('singleRight');

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
  const div = document.getElementById('output');
  if (div) {
    renderStaff(div);
  }
  initMIDI();
}
