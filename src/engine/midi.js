import { WebMidi } from 'webmidi';
import { 
  activeMidiNotes, 
  suppressedNotes, 
  currentBeatIndex, 
  setCurrentBeatIndex,
  musicData, 
  getStepInfo,
  getTotalSteps
} from './state.js';
import { getNoteValue } from '../utils/music-theory.js';

export function initMIDI(onStateChange) {
  const safeStateChange = (reg) => {
    if (typeof onStateChange === 'function') onStateChange(reg);
  };
  
  const ctx = {
    onStateChange: safeStateChange
  };

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
      activeMidiNotes.clear();
      suppressedNotes.clear();
      noteDisplayEl.textContent = '-';
      ctx.onStateChange();
    }
  };

  const checkMatch = () => {
    const info = getStepInfo(currentBeatIndex);
    const measureData = info ? musicData[info.measureIdx] : null;
    if (!measureData) return;

    const targetNotes = Array.from(new Set([
      ...(measureData.trebleBeats[info.stepIdx] || []), 
      ...(measureData.bassBeats[info.stepIdx] || [])
    ]));
    const targetVals = targetNotes.map(getNoteValue);
    const activeVals = Array.from(activeMidiNotes).map(getNoteValue);
    
    if (activeVals.length === targetVals.length && targetVals.every(v => activeVals.includes(v))) {
      const nextIndex = currentBeatIndex + 1;
      setCurrentBeatIndex(nextIndex);
      
      if (nextIndex >= getTotalSteps()) {
          ctx.onStateChange(true); 
      } else {
          activeMidiNotes.forEach(n => suppressedNotes.add(n));
          ctx.onStateChange();
      }
    }
  };

  const onNoteOn = (e) => {
    activeMidiNotes.add(e.note.identifier);
    
    const info = getStepInfo(currentBeatIndex);
    const measureData = info ? musicData[info.measureIdx] : null;
    if (measureData) {
      const targetPitches = [
        ...(measureData.trebleBeats[info.stepIdx] || []), 
        ...(measureData.bassBeats[info.stepIdx] || [])
      ];
      if (!targetPitches.includes(e.note.identifier)) {
        suppressedNotes.clear();
      }
    }

    noteDisplayEl.textContent = Array.from(activeMidiNotes).join(', ');
    checkMatch();
    ctx.onStateChange();
  };

  const onNoteOff = (e) => {
    activeMidiNotes.delete(e.note.identifier);
    suppressedNotes.delete(e.note.identifier);
    if (activeMidiNotes.size === 0) {
      noteDisplayEl.textContent = '-';
    } else {
      noteDisplayEl.textContent = Array.from(activeMidiNotes).join(', ');
    }
    checkMatch();
    ctx.onStateChange();
  };

  // Export internal logic for legacy test access
  initMIDI.checkMatch = checkMatch;
  initMIDI.updateStatus = updateStatus;
  initMIDI.onNoteOn = onNoteOn;
  initMIDI.onNoteOff = onNoteOff;

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
      if (e.port.type === 'input') addInputListeners(e.port);
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
