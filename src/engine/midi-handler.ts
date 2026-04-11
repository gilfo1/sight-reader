import { WebMidi } from 'webmidi';
import type { Input, NoteMessageEvent, PortEvent } from 'webmidi';
import { createMidiRuntime } from '@/engine/midi-handler-runtime';
import {
  getMidiStatusElements,
  renderConnectedMidiStatus,
  renderMidiInitializationError,
  renderMidiNoteDisplay,
  resetMidiStatusDisplay,
} from '@/engine/midi-handler-ui';

type MidiStateChangeHandler = (shouldRegenerate?: boolean, keepHeldNotes?: boolean) => void;
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
  const notifyStateChange = (shouldRegenerate?: boolean, keepHeldNotes?: boolean): void => {
    onStateChange?.(shouldRegenerate, keepHeldNotes);
  };
  const elements = getMidiStatusElements();

  if (!elements) return;

  const updateStatus = (): void => {
    if (WebMidi.inputs.length > 0) {
      renderConnectedMidiStatus(elements);
      return;
    }

    resetMidiStatusDisplay(elements);
    notifyStateChange();
  };

  const runtime = createMidiRuntime(notifyStateChange, () => renderMidiNoteDisplay(elements));

  initMidiHandler.checkMatch = runtime.checkMatch;
  initMidiHandler.updateStatus = updateStatus;
  initMidiHandler.onNoteOn = runtime.onNoteOn as MIDIInitFunction['onNoteOn'];
  initMidiHandler.onNoteOff = runtime.onNoteOff as MIDIInitFunction['onNoteOff'];
  initMidiHandler.triggerNoteOn = (identifier: string): void => {
    runtime.onNoteOn({ note: { identifier } } as NoteIdentifierEvent);
  };
  initMidiHandler.triggerNoteOff = (identifier: string): void => {
    runtime.onNoteOff({ note: { identifier } } as NoteIdentifierEvent);
  };

  const addInputListeners = (input: Input): void => {
    input.removeListener('noteon');
    input.removeListener('noteoff');
    input.addListener('noteon', runtime.onNoteOn);
    input.addListener('noteoff', runtime.onNoteOff);
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
    renderMidiInitializationError(elements, err);
  });
};
