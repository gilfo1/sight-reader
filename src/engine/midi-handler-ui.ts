import { WebMidi } from 'webmidi';
import { stopAllNotes } from '@/audio/note-player';
import { activeMidiNotes, suppressedNotes } from '@/engine/state';

export interface MidiStatusElements {
  deviceNameEl: HTMLElement;
  indicatorEl: HTMLElement;
  noteDisplayEl: HTMLElement;
}

export function getMidiStatusElements(): MidiStatusElements | null {
  const deviceNameEl = document.getElementById('midi-device-name');
  const indicatorEl = document.getElementById('midi-indicator');
  const noteDisplayEl = document.getElementById('current-note');

  if (!deviceNameEl || !indicatorEl || !noteDisplayEl) {
    return null;
  }

  return { deviceNameEl, indicatorEl, noteDisplayEl };
}

export function renderConnectedMidiStatus(elements: MidiStatusElements): void {
  elements.deviceNameEl.textContent = WebMidi.inputs[0]!.name;
  elements.indicatorEl.style.backgroundColor = 'green';
}

export function resetMidiStatusDisplay(elements: MidiStatusElements): void {
  elements.deviceNameEl.textContent = 'No device connected';
  elements.indicatorEl.style.backgroundColor = 'red';
  stopAllNotes();
  activeMidiNotes.clear();
  suppressedNotes.clear();
  elements.noteDisplayEl.textContent = '-';
}

export function renderMidiNoteDisplay(elements: MidiStatusElements): void {
  elements.noteDisplayEl.textContent = activeMidiNotes.size === 0 ? '-' : Array.from(activeMidiNotes).join(', ');
}

export function renderMidiInitializationError(elements: MidiStatusElements, error: Error): void {
  elements.deviceNameEl.textContent = error.message.includes('requestMIDIAccess')
    ? 'MIDI unavailable'
    : `MIDI Error: ${error.message}`;
  elements.indicatorEl.style.backgroundColor = 'red';
  elements.noteDisplayEl.textContent = '-';
}
