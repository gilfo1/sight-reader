import { WebMidi, NoteMessageEvent } from 'webmidi';
import { 
  activeMidiNotes, 
  suppressedNotes, 
  currentBeatIndex, 
  setCurrentBeatIndex,
  musicData, 
  getStepInfo,
  getTotalSteps
} from './state';
import { getNoteValue } from '../utils/music-theory';

export interface MIDIInitFunction {
  (onStateChange?: (reg?: boolean) => void): void;
  checkMatch?: () => void;
  updateStatus?: () => void;
  onNoteOn?: (e: NoteMessageEvent) => void;
  onNoteOff?: (e: NoteMessageEvent) => void;
}

export const initMIDI: MIDIInitFunction = function(onStateChange?: (reg?: boolean) => void): void {
  const safeStateChange = (reg?: boolean): void => {
    if (typeof onStateChange === 'function') onStateChange(reg);
  };
  
  const ctx = {
    onStateChange: safeStateChange
  };

  const deviceNameEl: HTMLElement | null = document.getElementById('midi-device-name');
  const indicatorEl: HTMLElement | null = document.getElementById('midi-indicator');
  const noteDisplayEl: HTMLElement | null = document.getElementById('current-note');

  if (!deviceNameEl || !indicatorEl || !noteDisplayEl) return;

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
    const info = getStepInfo(currentBeatIndex);
    const measureData = info ? musicData[info.measureIdx] : null;
    if (!measureData || !info) return;

    const targetNotes: string[] = Array.from(new Set([
      ...(measureData.trebleBeats[info.stepIdx] || []), 
      ...(measureData.bassBeats[info.stepIdx] || [])
    ]));
    const targetVals: number[] = targetNotes.map(getNoteValue);
    const activeVals: number[] = Array.from(activeMidiNotes).map(getNoteValue);
    
    if (activeVals.length === targetVals.length && targetVals.every(v => activeVals.includes(v))) {
      const nextIndex: number = currentBeatIndex + 1;
      setCurrentBeatIndex(nextIndex);
      
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
    
    const info = getStepInfo(currentBeatIndex);
    const measureData = info ? musicData[info.measureIdx] : null;
    if (measureData && info) {
      const targetPitches: string[] = [
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

  const onNoteOff = (e: NoteMessageEvent): void => {
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

  const addInputListeners = (input: any): void => {
    input.removeListener('noteon');
    input.removeListener('noteoff');
    input.addListener('noteon', onNoteOn);
    input.addListener('noteoff', onNoteOff);
  };

  WebMidi.enable().then(() => {
    updateStatus();
    WebMidi.inputs.forEach(addInputListeners);

    WebMidi.addListener('connected', (e: any) => {
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
};
