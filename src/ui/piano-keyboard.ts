import { stopAllNotes } from '@/audio/note-player';
import { initMidiHandler } from '@/engine/midi-handler';
import { activeMidiNotes } from '@/engine/state';
import type { KeyboardRange, KeyboardRangeState, KeyboardSizeMode } from '@/ui/piano-keyboard-layout';
import {
  DEFAULT_KEYBOARD_SIZE_MODE,
  getKeyboardRangeState as getResponsiveKeyboardRangeState,
  getKeyboardSizing,
  getNextKeyboardSizeMode,
  isBlackKey,
  KEYBOARD_CENTER_NOTE,
} from '@/ui/piano-keyboard-layout';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

const KEYBOARD_SIZE_MODE_STORAGE_KEY = 'keyboard-size-mode';
const VIEWPORT_SIDE_GUTTER = 40;

interface KeyboardNote {
  isBlackKey: boolean;
  note: string;
  whiteKeyIndex: number;
}

let currentSizeMode: KeyboardSizeMode = DEFAULT_KEYBOARD_SIZE_MODE;
let lastRenderedRange: KeyboardRangeState | null = null;
let rangeChangeHandler: (() => void) | null = null;
let keyboardResizeHandlerBound = false;

function getKeyboardContainer(): HTMLElement | null {
  return document.getElementById('piano-keyboard');
}

function getKeyboardViewportWidth(): number {
  const container = getKeyboardContainer();
  const layoutHost = container?.parentElement;
  const measuredWidth = layoutHost?.getBoundingClientRect().width ?? 0;

  if (measuredWidth > 0) {
    return measuredWidth;
  }

  return Math.max(window.innerWidth - VIEWPORT_SIDE_GUTTER, 320);
}

function loadKeyboardSizeMode(): KeyboardSizeMode {
  const storedMode = loadFromStorage<KeyboardSizeMode>(KEYBOARD_SIZE_MODE_STORAGE_KEY);
  if (storedMode === 'large' || storedMode === 'medium' || storedMode === 'small') {
    return storedMode;
  }

  return DEFAULT_KEYBOARD_SIZE_MODE;
}

function saveKeyboardSizeMode(): void {
  saveToStorage(KEYBOARD_SIZE_MODE_STORAGE_KEY, currentSizeMode);
}

function getCurrentKeyboardRangeState(): KeyboardRangeState {
  return getResponsiveKeyboardRangeState(getKeyboardViewportWidth(), currentSizeMode);
}

export function getVisibleKeyboardNotes(): string[] {
  return getCurrentKeyboardRangeState().visibleNotes;
}

export function getKeyboardRange(): KeyboardRange {
  const { minNote, maxNote } = getCurrentKeyboardRangeState();
  return { minNote, maxNote };
}

export function isPianoKeyboardOpen(): boolean {
  const details = document.getElementById('piano-keyboard-details') as HTMLDetailsElement | null;
  return details?.open ?? false;
}

export function getKeyboardSizeMode(): KeyboardSizeMode {
  return currentSizeMode;
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

function setKeyboardKeyActiveState(keyElement: HTMLElement, isActive: boolean): void {
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

function createKeyboardKey(keyboardNote: KeyboardNote): HTMLButtonElement {
  const key = document.createElement('button');
  const sizing = getKeyboardSizing(currentSizeMode);
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

function createKeyboardSizeToggle(layout: HTMLDivElement): HTMLButtonElement | null {
  const middleCKey = layout.querySelector<HTMLElement>(`[data-note="${KEYBOARD_CENTER_NOTE}"]`);

  if (!middleCKey) {
    return null;
  }

  const sizing = getKeyboardSizing(currentSizeMode);
  const toggle = document.createElement('button');
  const nextSizeMode = getNextKeyboardSizeMode(currentSizeMode);

  toggle.type = 'button';
  toggle.id = 'piano-keyboard-size-toggle';
  toggle.className = 'piano-keyboard-size-toggle';
  toggle.dataset.sizeMode = currentSizeMode;
  toggle.setAttribute('aria-label', `Cycle keyboard size. Current size: ${currentSizeMode}. Next size: ${nextSizeMode}.`);
  toggle.title = `Change keyboard size (${currentSizeMode} -> ${nextSizeMode})`;
  toggle.style.left = `${parseFloat(middleCKey.style.left) + (sizing.whiteKeyWidth / 2)}px`;

  ['large', 'medium', 'small'].forEach((sizeMode) => {
    const dash = document.createElement('span');
    dash.className = 'piano-keyboard-size-dash';
    dash.dataset.sizeMode = sizeMode;
    toggle.appendChild(dash);
  });

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    cycleKeyboardSizeMode();
  });

  return toggle;
}

function renderKeyboardLayout(): void {
  const container = getKeyboardContainer();

  if (!container) {
    return;
  }

  stopAllNotes();
  container.innerHTML = '';

  const keyboard = document.createElement('div');
  const rangeState = getCurrentKeyboardRangeState();
  const sizing = getKeyboardSizing(currentSizeMode);
  const layout = getKeyboardLayout();

  keyboard.id = 'piano-keyboard-layout';
  keyboard.className = 'piano-keyboard-layout';
  keyboard.dataset.sizeMode = currentSizeMode;
  keyboard.style.width = `${rangeState.whiteKeyCount * sizing.whiteKeyWidth}px`;
  keyboard.style.height = `${sizing.whiteKeyHeight}px`;
  keyboard.style.setProperty('--white-key-width', `${sizing.whiteKeyWidth}px`);
  keyboard.style.setProperty('--white-key-height', `${sizing.whiteKeyHeight}px`);
  keyboard.style.setProperty('--black-key-width', `${sizing.blackKeyWidth}px`);
  keyboard.style.setProperty('--black-key-height', `${sizing.blackKeyHeight}px`);

  layout.forEach((keyboardNote) => {
    keyboard.appendChild(createKeyboardKey(keyboardNote));
  });

  const sizeToggle = createKeyboardSizeToggle(keyboard);
  if (sizeToggle) {
    keyboard.appendChild(sizeToggle);
  }

  container.appendChild(keyboard);
  lastRenderedRange = rangeState;
  updatePianoKeyboardActiveNotes();
}

function notifyRangeChangeIfNeeded(previousRange: KeyboardRangeState | null): void {
  const currentRange = getCurrentKeyboardRangeState();
  const rangeChanged = !previousRange
    || previousRange.minNote !== currentRange.minNote
    || previousRange.maxNote !== currentRange.maxNote
    || previousRange.sizeMode !== currentRange.sizeMode;

  if (rangeChanged && isPianoKeyboardOpen()) {
    rangeChangeHandler?.();
  }
}

function handleKeyboardViewportChange(): void {
  const previousRange = lastRenderedRange;
  renderKeyboardLayout();
  notifyRangeChangeIfNeeded(previousRange);
}

export function setKeyboardSizeMode(sizeMode: KeyboardSizeMode): void {
  if (currentSizeMode === sizeMode) {
    return;
  }

  const previousRange = lastRenderedRange;
  currentSizeMode = sizeMode;
  saveKeyboardSizeMode();
  renderKeyboardLayout();
  notifyRangeChangeIfNeeded(previousRange);
}

export function cycleKeyboardSizeMode(): KeyboardSizeMode {
  const nextSizeMode = getNextKeyboardSizeMode(currentSizeMode);
  setKeyboardSizeMode(nextSizeMode);
  return nextSizeMode;
}

export function initPianoKeyboard(onRangeChange?: () => void): void {
  rangeChangeHandler = onRangeChange ?? null;
  currentSizeMode = loadKeyboardSizeMode();
  renderKeyboardLayout();

  if (!keyboardResizeHandlerBound) {
    window.addEventListener('resize', handleKeyboardViewportChange);
    keyboardResizeHandlerBound = true;
  }
}

export function updatePianoKeyboardActiveNotes(): void {
  document.querySelectorAll<HTMLElement>('#piano-keyboard [data-note]').forEach((keyElement) => {
    const note = keyElement.dataset.note;
    setKeyboardKeyActiveState(keyElement, note !== undefined && activeMidiNotes.has(note));
  });
}

export function releaseAllKeyboardNotes(): void {
  document.querySelectorAll<HTMLElement>('#piano-keyboard button[data-active="true"]').forEach((keyElement) => {
    releaseKeyboardNote(keyElement.dataset.note!, keyElement);
  });
  stopAllNotes();
}
