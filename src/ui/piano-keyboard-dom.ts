import { initMidiHandler } from '@/engine/midi-handler';
import type { KeyboardRangeState, KeyboardSizeMode } from '@/ui/piano-keyboard-layout';
import {
  getKeyboardSizing,
  getNextKeyboardSizeMode,
  isBlackKey,
  KEYBOARD_CENTER_NOTE,
} from '@/ui/piano-keyboard-layout';

const VIEWPORT_SIDE_GUTTER = 40;

export interface KeyboardNote {
  isBlackKey: boolean;
  note: string;
  whiteKeyIndex: number;
}

export function getKeyboardContainer(): HTMLElement | null {
  return document.getElementById('piano-keyboard');
}

export function getKeyboardViewportWidth(): number {
  const container = getKeyboardContainer();
  const layoutHost = container?.parentElement;
  const measuredWidth = layoutHost?.getBoundingClientRect().width ?? 0;

  if (measuredWidth > 0) {
    return measuredWidth;
  }

  return Math.max(window.innerWidth - VIEWPORT_SIDE_GUTTER, 320);
}

export function getKeyboardLayoutNotes(visibleNotes: string[]): KeyboardNote[] {
  let whiteKeyIndex = 0;

  return visibleNotes.map((note) => {
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

export function setKeyboardKeyActiveState(keyElement: HTMLElement, isActive: boolean): void {
  keyElement.dataset.active = isActive ? 'true' : 'false';
  keyElement.classList.toggle('piano-key-active', isActive);
  keyElement.style.transform = isActive ? 'translateY(2px)' : '';
  keyElement.style.background = isActive
    ? keyElement.dataset.activeBackground ?? ''
    : keyElement.dataset.defaultBackground ?? '';
  keyElement.style.color = isActive
    ? keyElement.dataset.activeColor ?? ''
    : keyElement.dataset.defaultColor ?? '';
}

function releaseKeyboardNote(note: string, keyElement: HTMLElement): void {
  setKeyboardKeyActiveState(keyElement, false);
  keyElement.style.transform = '';
  initMidiHandler.triggerNoteOff?.(note);
}

function pressKeyboardNote(note: string, keyElement: HTMLElement): void {
  setKeyboardKeyActiveState(keyElement, true);
  initMidiHandler.triggerNoteOn?.(note);
}

function createKeyboardKey(keyboardNote: KeyboardNote, sizeMode: KeyboardSizeMode): HTMLButtonElement {
  const key = document.createElement('button');
  const sizing = getKeyboardSizing(sizeMode);
  const left = keyboardNote.isBlackKey
    ? (keyboardNote.whiteKeyIndex * sizing.whiteKeyWidth) - sizing.blackKeyOffset
    : keyboardNote.whiteKeyIndex * sizing.whiteKeyWidth;

  key.type = 'button';
  key.className = keyboardNote.isBlackKey ? 'piano-key piano-key-black' : 'piano-key piano-key-white';
  key.dataset.note = keyboardNote.note;
  key.dataset.active = 'false';
  key.dataset.defaultBackground = keyboardNote.isBlackKey ? '#111111' : '#ffffff';
  key.dataset.defaultColor = keyboardNote.isBlackKey ? '#f7f7f7' : '#111111';
  key.dataset.activeBackground = keyboardNote.isBlackKey ? '#0f7c43' : '#dff5e6';
  key.dataset.activeColor = keyboardNote.isBlackKey ? '#ffffff' : '#0d3319';
  key.setAttribute('aria-label', `Play ${keyboardNote.note}`);
  key.style.position = 'absolute';
  key.style.left = `${left}px`;
  key.style.top = '0';
  key.style.width = `${keyboardNote.isBlackKey ? sizing.blackKeyWidth : sizing.whiteKeyWidth}px`;
  key.style.height = `${keyboardNote.isBlackKey ? sizing.blackKeyHeight : sizing.whiteKeyHeight}px`;
  key.style.background = key.dataset.defaultBackground;
  key.style.color = key.dataset.defaultColor;
  key.style.zIndex = keyboardNote.isBlackKey ? '2' : '1';

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

function createKeyboardSizeToggle(layout: HTMLDivElement, sizeMode: KeyboardSizeMode, onCycleSize: () => void): HTMLButtonElement | null {
  const middleCKey = layout.querySelector<HTMLElement>(`[data-note="${KEYBOARD_CENTER_NOTE}"]`);

  if (!middleCKey) {
    return null;
  }

  const sizing = getKeyboardSizing(sizeMode);
  const toggle = document.createElement('button');
  const nextSizeMode = getNextKeyboardSizeMode(sizeMode);

  toggle.type = 'button';
  toggle.id = 'piano-keyboard-size-toggle';
  toggle.className = 'piano-keyboard-size-toggle';
  toggle.dataset.sizeMode = sizeMode;
  toggle.setAttribute('aria-label', `Cycle keyboard size. Current size: ${sizeMode}. Next size: ${nextSizeMode}.`);
  toggle.title = `Change keyboard size (${sizeMode} -> ${nextSizeMode})`;
  toggle.style.left = `${parseFloat(middleCKey.style.left) + (sizing.whiteKeyWidth / 2)}px`;

  const dashModes: KeyboardSizeMode[] = ['large', 'medium', 'small'];
  dashModes.forEach((dashMode) => {
    const dash = document.createElement('span');
    dash.className = 'piano-keyboard-size-dash';
    dash.dataset.sizeMode = dashMode;
    toggle.appendChild(dash);
  });

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    onCycleSize();
  });

  return toggle;
}

export function buildKeyboardLayout(
  rangeState: KeyboardRangeState,
  sizeMode: KeyboardSizeMode,
  keyboardNotes: KeyboardNote[],
  onCycleSize: () => void,
): HTMLDivElement {
  const keyboard = document.createElement('div');
  const sizing = getKeyboardSizing(sizeMode);

  keyboard.id = 'piano-keyboard-layout';
  keyboard.className = 'piano-keyboard-layout';
  keyboard.dataset.sizeMode = sizeMode;
  keyboard.style.width = `${rangeState.whiteKeyCount * sizing.whiteKeyWidth}px`;
  keyboard.style.height = `${sizing.whiteKeyHeight}px`;
  keyboard.style.setProperty('--white-key-width', `${sizing.whiteKeyWidth}px`);
  keyboard.style.setProperty('--white-key-height', `${sizing.whiteKeyHeight}px`);
  keyboard.style.setProperty('--black-key-width', `${sizing.blackKeyWidth}px`);
  keyboard.style.setProperty('--black-key-height', `${sizing.blackKeyHeight}px`);

  keyboardNotes.forEach((keyboardNote) => {
    keyboard.appendChild(createKeyboardKey(keyboardNote, sizeMode));
  });

  const sizeToggle = createKeyboardSizeToggle(keyboard, sizeMode, onCycleSize);
  if (sizeToggle) {
    keyboard.appendChild(sizeToggle);
  }

  return keyboard;
}
