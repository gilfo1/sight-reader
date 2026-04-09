import { WebMidi } from 'webmidi';
import type { Input, NoteMessageEvent, PortEvent } from 'webmidi';
import { playNote, stopAllNotes, stopNote } from '@/audio/note-player';
import { 
  activeMidiNotes, 
  currentStepIndex,
  getStepInfo,
  getTargetNotesAtStep,
  getTotalSteps,
  musicData,
  recordCorrectNote,
  recordWrongNote,
  setCurrentStepIndex,
  suppressedNotes,
} from './state';
import { getNoteValue } from '@/utils/theory';

type MidiStateChangeHandler = (shouldRegenerate?: boolean) => void;
type NoteIdentifierEvent = Pick<NoteMessageEvent, 'note'>;

export interface MIDIInitFunction {
  (onStateChange?: MidiStateChangeHandler): void;
  checkMatch?: () => void;
  updateStatus?: () => void;
  onNoteOn?: (e: NoteMessageEvent) => void;
  onNoteOff?: (e: NoteMessageEvent) => void;
  triggerNoteOn?: (identifier: string) => void;
  triggerNoteOff?: (identifier: string) => void;
}

export const initMidiHandler: MIDIInitFunction = function(onStateChange?: MidiStateChangeHandler): void {
  const notifyStateChange = (shouldRegenerate?: boolean): void => {
    onStateChange?.(shouldRegenerate);
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
      stopAllNotes();
      activeMidiNotes.clear();
      suppressedNotes.clear();
      noteDisplayEl.textContent = '-';
      notifyStateChange();
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
          notifyStateChange(true); 
      } else {
          activeMidiNotes.forEach(n => suppressedNotes.add(n));
          notifyStateChange();
      }
    }
  };

  const onNoteOn = (e: NoteIdentifierEvent): void => {
    activeMidiNotes.add(e.note.identifier);
    playNote(e.note.identifier);
    
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
    notifyStateChange();
  };

  const onNoteOff = (e: NoteIdentifierEvent): void => {
    activeMidiNotes.delete(e.note.identifier);
    suppressedNotes.delete(e.note.identifier);
    stopNote(e.note.identifier);
    noteDisplayEl.textContent = activeMidiNotes.size === 0 ? '-' : Array.from(activeMidiNotes).join(', ');
    checkMatch();
    notifyStateChange();
  };

  initMidiHandler.checkMatch = checkMatch;
  initMidiHandler.updateStatus = updateStatus;
  initMidiHandler.onNoteOn = onNoteOn as MIDIInitFunction['onNoteOn'];
  initMidiHandler.onNoteOff = onNoteOff as MIDIInitFunction['onNoteOff'];
  initMidiHandler.triggerNoteOn = (identifier: string): void => {
    onNoteOn({ note: { identifier } } as NoteIdentifierEvent);
  };
  initMidiHandler.triggerNoteOff = (identifier: string): void => {
    onNoteOff({ note: { identifier } } as NoteIdentifierEvent);
  };

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
    deviceNameEl.textContent = err.message.includes('requestMIDIAccess')
      ? 'MIDI unavailable'
      : 'MIDI Error: ' + err.message;
    indicatorEl.style.backgroundColor = 'red';
    noteDisplayEl.textContent = '-';
  });
};
