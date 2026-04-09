import { beforeEach, describe, expect, it } from 'vitest';
import { activeMidiNotes } from '@/engine/state';
import {
  getKeyboardLayout,
  getKeyboardRange,
  getKeyboardSizeMode,
  getVisibleKeyboardNotes,
  initPianoKeyboard,
  isPianoKeyboardOpen,
  setKeyboardSizeMode,
  updatePianoKeyboardActiveNotes,
} from '@/ui/piano-keyboard';
import { getNoteValue } from '@/utils/theory';

describe('Piano Keyboard Layout', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <details id="piano-keyboard-details" open></details>
      <div class="keyboard-scroll">
        <div id="piano-keyboard"></div>
      </div>
    `;
    localStorage.clear();
    activeMidiNotes.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 960 });
    setKeyboardSizeMode('large');
  });

  it('computes a visible note range from the current viewport width', () => {
    const notes = getVisibleKeyboardNotes();
    expect(notes).toContain('C4');
    expect(getNoteValue(notes[0]!)).toBeLessThan(getNoteValue('C4'));
    expect(getNoteValue(notes[notes.length - 1]!)).toBeGreaterThan(getNoteValue('C4'));
  });

  it('contains both white and black keys in the derived layout', () => {
    const layout = getKeyboardLayout();
    expect(layout.filter((note) => !note.isBlackKey).length).toBeGreaterThanOrEqual(7);
    expect(layout.filter((note) => note.isBlackKey).length).toBeGreaterThan(0);
  });

  it('reports the playable range and accordion open state', () => {
    const range = getKeyboardRange();
    expect(getNoteValue(range.minNote)).toBeLessThanOrEqual(getNoteValue('C4'));
    expect(getNoteValue(range.maxNote)).toBeGreaterThanOrEqual(getNoteValue('C4'));
    expect(isPianoKeyboardOpen()).toBe(true);
  });

  it('switches size mode and increases visible notes with smaller keys', () => {
    const largeCount = getVisibleKeyboardNotes().length;

    setKeyboardSizeMode('medium');
    const mediumCount = getVisibleKeyboardNotes().length;

    setKeyboardSizeMode('small');
    const smallCount = getVisibleKeyboardNotes().length;

    expect(getKeyboardSizeMode()).toBe('small');
    expect(mediumCount).toBeGreaterThan(largeCount);
    expect(smallCount).toBeGreaterThan(mediumCount);
  });

  it('syncs rendered keys with active MIDI notes', () => {
    initPianoKeyboard();
    activeMidiNotes.add('C4');
    activeMidiNotes.add('E4');

    updatePianoKeyboardActiveNotes();

    expect((document.querySelector('[data-note="C4"]') as HTMLButtonElement).dataset.active).toBe('true');
    expect((document.querySelector('[data-note="E4"]') as HTMLButtonElement).classList.contains('piano-key-active')).toBe(true);
    expect((document.querySelector('[data-note="D4"]') as HTMLButtonElement).dataset.active).toBe('false');
  });
});
