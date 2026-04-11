import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { generateScoreData, initApp, resetGameState } from '@/main';
import { getEffectiveUIConfig, getUIConfig } from '@/ui/controls';
import { getKeyboardRange, getKeyboardSizeMode } from '@/ui/piano-keyboard';
import { getNoteValue } from '@/utils/theory';

describe('On-Screen Piano Keyboard Range Override', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameState();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 960 });
    const html = readFileSync('./index.html', 'utf-8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    Array.from(doc.body.attributes).forEach((attribute) => {
      document.body.setAttribute(attribute.name, attribute.value);
    });
    window.confirm = vi.fn().mockReturnValue(true);
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map(),
    });
  });

  function collectPitches() {
    const music = generateScoreData();
    return music.flatMap((measure) => [...measure.trebleSteps.flat(), ...measure.bassSteps.flat()]);
  }

  it('forces the effective note range to the keyboard range while open', async () => {
    await initApp();

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const minNote = document.getElementById('min-note') as HTMLInputElement;
    const maxNote = document.getElementById('max-note') as HTMLInputElement;
    const keyboardRange = getKeyboardRange();
    minNote.value = 'A0';
    maxNote.value = 'C8';

    expect(getUIConfig().minNote).toBe('A0');
    expect(getUIConfig().maxNote).toBe('C8');
    expect(getEffectiveUIConfig().minNote).toBe(keyboardRange.minNote);
    expect(getEffectiveUIConfig().maxNote).toBe(keyboardRange.maxNote);
  });

  it('restores the settings range when the keyboard accordion is closed', async () => {
    await initApp();

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const minNote = document.getElementById('min-note') as HTMLInputElement;
    const maxNote = document.getElementById('max-note') as HTMLInputElement;
    minNote.value = 'A0';
    maxNote.value = 'C8';
    keyboardDetails.open = false;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    expect(getEffectiveUIConfig().minNote).toBe('A0');
    expect(getEffectiveUIConfig().maxNote).toBe('C8');
  });

  it('generates only keyboard-playable notes while the keyboard is open', async () => {
    await initApp();

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const keyboardRange = getKeyboardRange();
    const pitches = collectPitches();
    pitches.forEach((pitch) => {
      expect(getNoteValue(pitch)).toBeGreaterThanOrEqual(getNoteValue(keyboardRange.minNote));
      expect(getNoteValue(pitch)).toBeLessThanOrEqual(getNoteValue(keyboardRange.maxNote));
    });
  });

  it('returns to the configured range after the keyboard is closed', async () => {
    await initApp();

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const minNote = document.getElementById('min-note') as HTMLInputElement;
    const maxNote = document.getElementById('max-note') as HTMLInputElement;
    minNote.value = 'A0';
    maxNote.value = 'B0';
    keyboardDetails.open = false;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const pitches = collectPitches();
    expect(pitches.every((pitch) => getNoteValue(pitch) <= getNoteValue('B0'))).toBe(true);
  });

  it('widens the playable range when the keyboard switches to smaller keys', async () => {
    await initApp();

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const largeRange = getKeyboardRange();
    const sizeToggle = document.getElementById('piano-keyboard-size-toggle') as HTMLButtonElement;
    sizeToggle.click();
    const mediumRange = getKeyboardRange();
    sizeToggle.click();
    const smallRange = getKeyboardRange();

    expect(getKeyboardSizeMode()).toBe('small');
    expect(getNoteValue(mediumRange.minNote)).toBeLessThanOrEqual(getNoteValue(largeRange.minNote));
    expect(getNoteValue(mediumRange.maxNote)).toBeGreaterThanOrEqual(getNoteValue(largeRange.maxNote));
    expect(getNoteValue(smallRange.minNote)).toBeLessThanOrEqual(getNoteValue(mediumRange.minNote));
    expect(getNoteValue(smallRange.maxNote)).toBeGreaterThanOrEqual(getNoteValue(mediumRange.maxNote));

    const pitches = collectPitches();
    expect(pitches.every((pitch) => getNoteValue(pitch) >= getNoteValue(smallRange.minNote))).toBe(true);
    expect(pitches.every((pitch) => getNoteValue(pitch) <= getNoteValue(smallRange.maxNote))).toBe(true);
  });

  it('updates the playable range when the viewport width changes', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 640 });
    await initApp();

    const narrowRange = getKeyboardRange();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
    window.dispatchEvent(new Event('resize'));
    const wideRange = getKeyboardRange();

    expect(getNoteValue(wideRange.minNote)).toBeLessThanOrEqual(getNoteValue(narrowRange.minNote));
    expect(getNoteValue(wideRange.maxNote)).toBeGreaterThanOrEqual(getNoteValue(narrowRange.maxNote));
  });

  it('loads a saved keyboard size mode before generating the initial score', async () => {
    localStorage.setItem('keyboard-size-mode', JSON.stringify('small'));
    await initApp();

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const layout = document.getElementById('piano-keyboard-layout') as HTMLDivElement;
    const range = getKeyboardRange();
    const pitches = collectPitches();

    expect(layout.dataset.sizeMode).toBe('small');
    expect(pitches.every((pitch) => getNoteValue(pitch) >= getNoteValue(range.minNote))).toBe(true);
    expect(pitches.every((pitch) => getNoteValue(pitch) <= getNoteValue(range.maxNote))).toBe(true);
  });
});
