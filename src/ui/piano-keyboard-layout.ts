import { ALL_PIANO_NOTES } from '@/constants/music';
import { getNoteValue } from '@/utils/theory';

export type KeyboardSizeMode = 'large' | 'medium' | 'small' | 'extra-small';

export interface KeyboardSizing {
  blackKeyHeight: number;
  blackKeyOffset: number;
  blackKeyWidth: number;
  whiteKeyHeight: number;
  whiteKeyWidth: number;
}

export interface KeyboardRange {
  maxNote: string;
  minNote: string;
}

export interface KeyboardRangeState extends KeyboardRange {
  sizeMode: KeyboardSizeMode;
  visibleNotes: string[];
  whiteKeyCount: number;
}

export const DEFAULT_KEYBOARD_SIZE_MODE: KeyboardSizeMode = 'small';
export const KEYBOARD_CENTER_NOTE = 'C4';

const WHITE_NOTES = ALL_PIANO_NOTES.filter((note) => !isBlackKey(note));
const KEYBOARD_SIZE_ORDER: KeyboardSizeMode[] = ['large', 'medium', 'small'];
const KEYBOARD_SIZING: Record<KeyboardSizeMode, KeyboardSizing> = {
  large: {
    whiteKeyWidth: 48,
    whiteKeyHeight: 180,
    blackKeyWidth: 30,
    blackKeyHeight: 112,
    blackKeyOffset: 15,
  },
  medium: {
    whiteKeyWidth: 40,
    whiteKeyHeight: 164,
    blackKeyWidth: 25,
    blackKeyHeight: 102,
    blackKeyOffset: 12.5,
  },
  small: {
    whiteKeyWidth: 34,
    whiteKeyHeight: 148,
    blackKeyWidth: 21,
    blackKeyHeight: 92,
    blackKeyOffset: 10.5,
  },
  'extra-small': {
    whiteKeyWidth: 28,
    whiteKeyHeight: 132,
    blackKeyWidth: 17,
    blackKeyHeight: 82,
    blackKeyOffset: 8.5,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isBlackKey(note: string): boolean {
  return note.includes('#') || note.includes('b');
}

export function getKeyboardSizing(sizeMode: KeyboardSizeMode): KeyboardSizing {
  return KEYBOARD_SIZING[sizeMode];
}

export function getNextKeyboardSizeMode(sizeMode: KeyboardSizeMode): KeyboardSizeMode {
  const currentIndex = KEYBOARD_SIZE_ORDER.indexOf(sizeMode as any);
  if (currentIndex === -1) {
    return KEYBOARD_SIZE_ORDER[0]!;
  }
  return KEYBOARD_SIZE_ORDER[(currentIndex + 1) % KEYBOARD_SIZE_ORDER.length]!;
}

export function getKeyboardWhiteKeyCount(availableWidth: number, sizeMode: KeyboardSizeMode): number {
  const whiteKeyWidth = getKeyboardSizing(sizeMode).whiteKeyWidth;
  const fittingWhiteKeys = Math.floor(availableWidth / whiteKeyWidth);
  return clamp(fittingWhiteKeys, 7, WHITE_NOTES.length);
}

export function getKeyboardRangeState(availableWidth: number, sizeMode: KeyboardSizeMode): KeyboardRangeState {
  let activeSizeMode = sizeMode;

  // Responsively switch to 'extra-small' if 'small' cannot show 2 octaves (14 white keys)
  if (sizeMode === 'small') {
    const smallWhiteKeyWidth = KEYBOARD_SIZING.small.whiteKeyWidth;
    if (availableWidth / smallWhiteKeyWidth < 14) {
      activeSizeMode = 'extra-small';
    }
  }

  const whiteKeyCount = getKeyboardWhiteKeyCount(availableWidth, activeSizeMode);
  const centerIndex = WHITE_NOTES.indexOf(KEYBOARD_CENTER_NOTE);
  const maxStartIndex = WHITE_NOTES.length - whiteKeyCount;
  const startIndex = clamp(centerIndex - Math.floor(whiteKeyCount / 2), 0, maxStartIndex);
  const endIndex = startIndex + whiteKeyCount - 1;
  const minNote = WHITE_NOTES[startIndex]!;
  const maxNote = WHITE_NOTES[endIndex]!;
  const minValue = getNoteValue(minNote);
  const maxValue = getNoteValue(maxNote);
  const visibleNotes = ALL_PIANO_NOTES.filter((note) => {
    const value = getNoteValue(note);
    return value >= minValue && value <= maxValue;
  });

  return {
    minNote,
    maxNote,
    sizeMode: activeSizeMode,
    visibleNotes,
    whiteKeyCount,
  };
}
