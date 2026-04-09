import { playNote, stopAllNotes, stopNote } from '@/audio/note-player';
import { initMidiHandler } from '@/engine/midi-handler';
import { getNoteValue } from '@/utils/theory';

const KEYBOARD_START_NOTE = 'C3';
const KEYBOARD_END_NOTE = 'F5';
const WHITE_KEY_WIDTH = 48;
const WHITE_KEY_HEIGHT = 180;
const BLACK_KEY_WIDTH = 30;
const BLACK_KEY_HEIGHT = 112;
const BLACK_KEY_OFFSET = 15;

interface KeyboardNote {
  isBlackKey: boolean;
  note: string;
  whiteKeyIndex: number;
}

function isBlackKey(note: string): boolean {
  return note.includes('#') || note.includes('b');
}

export function getVisibleKeyboardNotes(): string[] {
  const notes: string[] = [];

  for (let value = getNoteValue(KEYBOARD_START_NOTE); value <= getNoteValue(KEYBOARD_END_NOTE); value++) {
    const octave = Math.floor(value / 12) - 1;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    notes.push(`${noteNames[value % 12]}${octave}`);
  }

  return notes;
}

export function getKeyboardRange(): { minNote: string; maxNote: string } {
  return {
    minNote: KEYBOARD_START_NOTE,
    maxNote: KEYBOARD_END_NOTE,
  };
}

export function isPianoKeyboardOpen(): boolean {
  const details = document.getElementById('piano-keyboard-details') as HTMLDetailsElement | null;
  return details?.open ?? false;
}

export function getKeyboardLayout(): KeyboardNote[] {
  let whiteKeyIndex = 0;

  return getVisibleKeyboardNotes().map((note) => {
    const keyboardNote: KeyboardNote = {
      note,
      isBlackKey: isBlackKey(note),
      whiteKeyIndex,
    };

    if (!keyboardNote.isBlackKey) {
      whiteKeyIndex++;
    }

    return keyboardNote;
  });
}

function releaseKeyboardNote(note: string, keyElement: HTMLElement): void {
  keyElement.dataset.active = 'false';
  keyElement.style.transform = '';
  keyElement.style.background = keyElement.dataset.defaultBackground ?? '';
  keyElement.style.color = keyElement.dataset.defaultColor ?? '';
  initMidiHandler.triggerNoteOff?.(note);
  stopNote(note);
}

function pressKeyboardNote(note: string, keyElement: HTMLElement): void {
  keyElement.dataset.active = 'true';
  keyElement.style.transform = 'translateY(2px)';
  keyElement.style.background = keyElement.dataset.activeBackground ?? '';
  keyElement.style.color = keyElement.dataset.activeColor ?? '';
  initMidiHandler.triggerNoteOn?.(note);
  playNote(note);
}

function createKeyboardKey(keyboardNote: KeyboardNote): HTMLButtonElement {
  const key = document.createElement('button');
  const left = keyboardNote.isBlackKey
    ? (keyboardNote.whiteKeyIndex * WHITE_KEY_WIDTH) - BLACK_KEY_OFFSET
    : keyboardNote.whiteKeyIndex * WHITE_KEY_WIDTH;

  key.type = 'button';
  key.dataset.note = keyboardNote.note;
  key.dataset.active = 'false';
  key.dataset.defaultBackground = keyboardNote.isBlackKey ? '#1d1d21' : '#fcfbf7';
  key.dataset.defaultColor = keyboardNote.isBlackKey ? '#f6f2ea' : '#2b241c';
  key.dataset.activeBackground = keyboardNote.isBlackKey ? '#585861' : '#e5dcc9';
  key.dataset.activeColor = keyboardNote.isBlackKey ? '#ffffff' : '#1d1710';
  key.setAttribute('aria-label', `Play ${keyboardNote.note}`);
  key.style.position = 'absolute';
  key.style.left = `${left}px`;
  key.style.top = '0';
  key.style.width = `${keyboardNote.isBlackKey ? BLACK_KEY_WIDTH : WHITE_KEY_WIDTH}px`;
  key.style.height = `${keyboardNote.isBlackKey ? BLACK_KEY_HEIGHT : WHITE_KEY_HEIGHT}px`;
  key.style.border = keyboardNote.isBlackKey ? '1px solid #050505' : '1px solid #b9a88e';
  key.style.borderRadius = keyboardNote.isBlackKey ? '0 0 10px 10px' : '0 0 14px 14px';
  key.style.background = key.dataset.defaultBackground;
  key.style.color = key.dataset.defaultColor;
  key.style.display = 'flex';
  key.style.alignItems = 'flex-end';
  key.style.justifyContent = 'center';
  key.style.boxSizing = 'border-box';
  key.style.userSelect = 'none';
  key.style.cursor = 'pointer';
  key.style.touchAction = 'none';
  key.style.zIndex = keyboardNote.isBlackKey ? '2' : '1';
  key.style.boxShadow = keyboardNote.isBlackKey
    ? '0 9px 18px rgba(0, 0, 0, 0.28)'
    : '0 12px 24px rgba(60, 44, 20, 0.18)';

  const startPress = (event: Event): void => {
    event.preventDefault();
    if (key.dataset.active === 'true') {
      return;
    }
    pressKeyboardNote(keyboardNote.note, key);
  };

  const endPress = (): void => {
    if (key.dataset.active !== 'true') {
      return;
    }
    releaseKeyboardNote(keyboardNote.note, key);
  };

  key.addEventListener('mousedown', startPress);
  key.addEventListener('mouseup', endPress);
  key.addEventListener('mouseleave', endPress);
  key.addEventListener('touchstart', startPress, { passive: false });
  key.addEventListener('touchend', endPress);
  key.addEventListener('touchcancel', endPress);

  return key;
}

export function initPianoKeyboard(): void {
  const container = document.getElementById('piano-keyboard');

  if (!container) {
    return;
  }

  stopAllNotes();
  container.innerHTML = '';

  const keyboard = document.createElement('div');
  const layout = getKeyboardLayout();
  const whiteKeyCount = layout.filter((keyboardNote) => !keyboardNote.isBlackKey).length;

  keyboard.id = 'piano-keyboard-layout';
  keyboard.style.position = 'relative';
  keyboard.style.width = `${whiteKeyCount * WHITE_KEY_WIDTH}px`;
  keyboard.style.height = `${WHITE_KEY_HEIGHT}px`;
  keyboard.style.maxWidth = '100%';
  keyboard.style.margin = '0 auto';

  layout.forEach((keyboardNote) => {
    keyboard.appendChild(createKeyboardKey(keyboardNote));
  });

  container.appendChild(keyboard);
}

export function releaseAllKeyboardNotes(): void {
  document.querySelectorAll<HTMLElement>('#piano-keyboard button[data-active="true"]').forEach((keyElement) => {
    releaseKeyboardNote(keyElement.dataset.note!, keyElement);
  });
  stopAllNotes();
}
