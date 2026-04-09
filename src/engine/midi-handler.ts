import { WebMidi, NoteMessageEvent, Input, PortEvent } from 'webmidi';
import { 
  activeMidiNotes, 
  suppressedNotes, 
  currentStepIndex,
  setCurrentStepIndex,
  musicData,
  getStepInfo,
  getTargetNotesAtStep,
  getTotalSteps,
  recordCorrectNote,
  recordWrongNote
} from './state';
import { getNoteValue } from '@/utils/theory';

export interface MIDIInitFunction {
  (onStateChange?: (reg?: boolean) => void): void;
  checkMatch?: () => void;
  updateStatus?: () => void;
  onNoteOn?: (e: NoteMessageEvent) => void;
  onNoteOff?: (e: NoteMessageEvent) => void;
}

export const initMidiHandler: MIDIInitFunction = function(onStateChange?: (reg?: boolean) => void): void {
  const safeStateChange = (reg?: boolean): void => {
    if (typeof onStateChange === 'function') onStateChange(reg);
  };
  
  const ctx = {
    onStateChange: safeStateChange
  };

  const deviceNameEl = document.getElementById('midi-device-name');
  const indicatorEl = document.getElementById('midi-indicator');
  const noteDisplayEl = document.getElementById('current-note');

  if (!deviceNameEl || !indicatorEl || !noteDisplayEl) return;

  let stepStartTime: number = Date.now();
  let lastProcessedStep: number = -1;

  const updateStatus = (): void => {
    if (WebMidi.inputs.length > 0) {
      deviceNameEl.textContent = WebMidi.inputs[0]!.name;
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

  const checkMatch = (): void => {
    const targetNotes = getTargetNotesAtStep(currentStepIndex);
    if (targetNotes.length === 0) return;

    const targetVals = targetNotes.map(getNoteValue);
    const activeVals = Array.from(activeMidiNotes).map(getNoteValue);
    
    if (activeVals.length === targetVals.length && targetVals.every(v => activeVals.includes(v))) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      stepStartTime = Date.now(); // Reset timer for next step
      
      if (nextIndex >= getTotalSteps()) {
          ctx.onStateChange(true); 
      } else {
          activeMidiNotes.forEach(n => suppressedNotes.add(n));
          ctx.onStateChange();
      }
    }
  };

  const onNoteOn = (e: NoteMessageEvent): void => {
    activeMidiNotes.add(e.note.identifier);
    
    if (currentStepIndex !== lastProcessedStep) {
        stepStartTime = Date.now();
        lastProcessedStep = currentStepIndex;
    }
    
    const targetPitches = getTargetNotesAtStep(currentStepIndex);
    if (targetPitches.length > 0) {
      const info = getStepInfo(currentStepIndex)!;
      const measureData = musicData[info.measureIdx]!;

      if (targetPitches.includes(e.note.identifier)) {
        const timeTaken = Date.now() - stepStartTime;
        recordCorrectNote(e.note.identifier, measureData.keySignature, timeTaken);
      } else {
        recordWrongNote(e.note.identifier, targetPitches, measureData.keySignature);
        suppressedNotes.clear();
      }
    }

    noteDisplayEl.textContent = Array.from(activeMidiNotes).join(', ');
    checkMatch();
    ctx.onStateChange();
  };

  const onNoteOff = (e: NoteMessageEvent): void => {
    activeMidiNotes.delete(e.note.identifier);
    suppressedNotes.delete(e.note.identifier);
    noteDisplayEl.textContent = activeMidiNotes.size === 0 ? '-' : Array.from(activeMidiNotes).join(', ');
    checkMatch();
    ctx.onStateChange();
  };

  initMidiHandler.checkMatch = checkMatch;
  initMidiHandler.updateStatus = updateStatus;
  initMidiHandler.onNoteOn = onNoteOn;
  initMidiHandler.onNoteOff = onNoteOff;

  const addInputListeners = (input: Input): void => {
    input.removeListener('noteon');
    input.removeListener('noteoff');
    input.addListener('noteon', onNoteOn);
    input.addListener('noteoff', onNoteOff);
  };

  WebMidi.enable().then((): void => {
    updateStatus();
    WebMidi.inputs.forEach(addInputListeners);

    WebMidi.addListener('connected', (e: PortEvent): void => {
      if (e.port.type === 'input') addInputListeners(e.port as Input);
      updateStatus();
    });

    WebMidi.addListener('disconnected', (): void => {
      updateStatus();
    });
  }).catch((err: Error): void => {
    console.error('MIDI could not be enabled:', err);
    deviceNameEl.textContent = 'MIDI Error: ' + err.message;
  });
};
