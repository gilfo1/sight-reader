import { beforeEach, describe, expect, it } from 'vitest';
import { getKeyboardLayout, getKeyboardRange, getVisibleKeyboardNotes, isPianoKeyboardOpen } from '@/ui/piano-keyboard';

describe('Piano Keyboard Layout', () => {
  beforeEach(() => {
    document.body.innerHTML = '<details id="piano-keyboard-details" open></details>';
  });

  it('renders a 2.5 octave note range from C3 to F5', () => {
    const notes = getVisibleKeyboardNotes();
    expect(notes[0]).toBe('C3');
    expect(notes[notes.length - 1]).toBe('F5');
    expect(notes).toHaveLength(30);
  });

  it('contains the expected number of white and black keys', () => {
    const layout = getKeyboardLayout();
    expect(layout.filter((note) => !note.isBlackKey)).toHaveLength(18);
    expect(layout.filter((note) => note.isBlackKey)).toHaveLength(12);
  });

  it('reports the playable range and accordion open state', () => {
    expect(getKeyboardRange()).toEqual({ minNote: 'C3', maxNote: 'F5' });
    expect(isPianoKeyboardOpen()).toBe(true);
  });
});
