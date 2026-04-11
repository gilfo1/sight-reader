import { stopAllNotes } from '@/audio/note-player';
import { activeMidiNotes } from '@/engine/state';
import type { KeyboardRange, KeyboardRangeState, KeyboardSizeMode } from '@/ui/piano-keyboard-layout';
import {
  DEFAULT_KEYBOARD_SIZE_MODE,
  getKeyboardRangeState as getResponsiveKeyboardRangeState,
  getNextKeyboardSizeMode,
} from '@/ui/piano-keyboard-layout';
import {
  buildKeyboardLayout,
  getKeyboardContainer,
  getKeyboardLayoutNotes,
  getKeyboardViewportWidth,
  setKeyboardKeyActiveState,
} from '@/ui/piano-keyboard-dom';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

const KEYBOARD_SIZE_MODE_STORAGE_KEY = 'keyboard-size-mode';

let currentSizeMode: KeyboardSizeMode = DEFAULT_KEYBOARD_SIZE_MODE;
let lastRenderedRange: KeyboardRangeState | null = null;
let rangeChangeHandler: (() => void) | null = null;
let keyboardResizeHandlerBound = false;

function loadKeyboardSizeMode(): KeyboardSizeMode {
  const storedMode = loadFromStorage<KeyboardSizeMode>(KEYBOARD_SIZE_MODE_STORAGE_KEY);
  if (storedMode === 'large' || storedMode === 'medium' || storedMode === 'small' || storedMode === 'extra-small') {
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
  return getCurrentKeyboardRangeState().sizeMode;
}

export function getKeyboardLayout() {
  return getKeyboardLayoutNotes(getVisibleKeyboardNotes());
}

function renderKeyboardLayout(): void {
  const container = getKeyboardContainer();

  if (!container) {
    return;
  }

  stopAllNotes();
  container.innerHTML = '';

  const rangeState = getCurrentKeyboardRangeState();
  const keyboard = buildKeyboardLayout(
    rangeState,
    currentSizeMode,
    getKeyboardLayout(),
    () => cycleKeyboardSizeMode(),
  );

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
  document.querySelectorAll<HTMLElement>('#piano-keyboard .piano-key-active').forEach((keyElement) => {
    setKeyboardKeyActiveState(keyElement, false);
  });
}
