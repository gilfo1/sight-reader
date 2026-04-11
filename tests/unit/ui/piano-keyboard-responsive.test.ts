import { describe, expect, it } from 'vitest';
import { getKeyboardRangeState, WHITE_NOTES } from '@/ui/piano-keyboard-layout';

describe('Piano Keyboard Layout Responsive Logic', () => {
  it('clamps minimum white key count to 7 for very narrow widths', () => {
    // 100px / 48px (large mode) = 2.08, but should be clamped to 7
    const range = getKeyboardRangeState(100, 'large');
    expect(range.whiteKeyCount).toBe(7);
  });

  it('calculates larger ranges for wider viewports', () => {
    // 960px / 48px = 20 keys
    const range960 = getKeyboardRangeState(960, 'large');
    expect(range960.whiteKeyCount).toBe(20);

    // 1920px / 48px = 40 keys
    const range1920 = getKeyboardRangeState(1920, 'large');
    expect(range1920.whiteKeyCount).toBe(40);
  });

  it('clamps maximum white key count to the full piano size (52 white keys)', () => {
    // 5000px / 48px = 104 keys, but should be 52
    const range5000 = getKeyboardRangeState(5000, 'large');
    expect(range5000.whiteKeyCount).toBe(52);
  });

  it('shifts the range to keep C4 centered as width decreases', () => {
    const rangeFull = getKeyboardRangeState(3000, 'large'); // Full keyboard
    expect(rangeFull.minNote).toBe('A0');
    expect(rangeFull.maxNote).toBe('C8');

    const rangeNarrow = getKeyboardRangeState(400, 'large'); // ~8 keys
    // C4 is index 30 in WHITE_NOTES (A0 is index 0)
    // 30 - floor(8/2) = 26
    // WHITE_NOTES[26] is C4 - 4 white keys = G3
    expect(rangeNarrow.visibleNotes).toContain('C4');
  });

  it('handles small size mode correctly', () => {
    // A narrow viewport forces the responsive extra-small fallback from small mode.
    const rangeSmall = getKeyboardRangeState(340, 'small');
    expect(rangeSmall.sizeMode).toBe('extra-small');
    expect(rangeSmall.whiteKeyCount).toBe(12);
  });
});
