import { describe, expect, it } from 'vitest';
import {
  getKeyboardRangeState,
  getKeyboardSizing,
  getKeyboardWhiteKeyCount,
  getNextKeyboardSizeMode,
  KEYBOARD_CENTER_NOTE,
} from '@/ui/piano-keyboard-layout';
import { getNoteValue } from '@/utils/theory';

describe('Piano Keyboard Layout Calculations', () => {
  it('cycles size modes in a stable order', () => {
    expect(getNextKeyboardSizeMode('large')).toBe('medium');
    expect(getNextKeyboardSizeMode('medium')).toBe('small');
    expect(getNextKeyboardSizeMode('small')).toBe('large');
  });

  it('fits more white keys into the same width as keys get smaller', () => {
    expect(getKeyboardWhiteKeyCount(960, 'large')).toBeLessThan(getKeyboardWhiteKeyCount(960, 'medium'));
    expect(getKeyboardWhiteKeyCount(960, 'medium')).toBeLessThan(getKeyboardWhiteKeyCount(960, 'small'));
  });

  it('keeps middle C inside the visible range', () => {
    const range = getKeyboardRangeState(960, 'large');
    expect(range.visibleNotes).toContain(KEYBOARD_CENTER_NOTE);
    expect(getNoteValue(range.minNote)).toBeLessThanOrEqual(getNoteValue(KEYBOARD_CENTER_NOTE));
    expect(getNoteValue(range.maxNote)).toBeGreaterThanOrEqual(getNoteValue(KEYBOARD_CENTER_NOTE));
  });

  it('expands to the full piano when enough width is available', () => {
    const range = getKeyboardRangeState(5000, 'small');
    expect(range.minNote).toBe('A0');
    expect(range.maxNote).toBe('C8');
    expect(range.whiteKeyCount).toBe(52);
  });

  it('exposes consistent size metrics for each mode', () => {
    const large = getKeyboardSizing('large');
    const medium = getKeyboardSizing('medium');
    const small = getKeyboardSizing('small');

    expect(large.whiteKeyWidth).toBeGreaterThan(medium.whiteKeyWidth);
    expect(medium.whiteKeyWidth).toBeGreaterThan(small.whiteKeyWidth);
    expect(large.whiteKeyHeight).toBeGreaterThan(medium.whiteKeyHeight);
    expect(medium.whiteKeyHeight).toBeGreaterThan(small.whiteKeyHeight);
  });
});
