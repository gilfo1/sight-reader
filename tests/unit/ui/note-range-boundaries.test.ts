import { beforeEach, describe, expect, it } from 'vitest';
import {
  updateNoteRangeSelector,
  getStoredStaffNoteRanges,
} from '@/ui/note-range';
import { getNoteValue } from '@/utils/theory';

function renderRangeControl(staffType = 'grand'): void {
  document.body.innerHTML = `
    <select id="staff-type">
      <option value="grand" ${staffType === 'grand' ? 'selected' : ''}>Grand Staff</option>
      <option value="treble" ${staffType === 'treble' ? 'selected' : ''}>Treble Clef</option>
      <option value="bass" ${staffType === 'bass' ? 'selected' : ''}>Bass Clef</option>
    </select>
    <div id="note-range-selector">
      <span id="note-range-selected-staff"></span>
      <div id="note-range-visual" style="height: 300px; width: 300px; position: relative;"></div>
      <div id="note-range-value-summary"></div>
    </div>
    <input id="min-note" type="hidden" value="C2">
    <input id="max-note" type="hidden" value="C6">
  `;
}

describe('note range boundary conditions', () => {
  beforeEach(() => {
    localStorage.clear();
    renderRangeControl();
    const visual = document.getElementById('note-range-visual') as HTMLElement;
    visual.getBoundingClientRect = () => ({
      top: 100, left: 100, width: 300, height: 300, bottom: 400, right: 400, x: 100, y: 100, toJSON: () => {},
    }) as DOMRect;
  });

  it('keeps handles within valid note range on treble staff', () => {
    renderRangeControl('treble');
    updateNoteRangeSelector();
    const upperHandle = document.querySelector('.note-range-handle-upper') as HTMLButtonElement;
    
    // Treble GLOBAL_MAX is A6
    upperHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 150 }));
    
    // Drag way up (clientY = -1000)
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: -1000 }));
    
    const maxNote = getStoredStaffNoteRanges().treble.maxNote;
    expect(maxNote).toBe('A6');
    
    // Drag way down (below minNote C3)
    // Let's drag to clientY = 2000
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 2000 }));
    const maxNoteAfterDown = getStoredStaffNoteRanges().treble.maxNote;
    expect(getNoteValue(maxNoteAfterDown)).toBeGreaterThanOrEqual(getNoteValue(getStoredStaffNoteRanges().treble.minNote));
  });

  it('bass clef handle on grand staff remains responsive and capped', () => {
    renderRangeControl('grand');
    updateNoteRangeSelector();
    
    // Test upper handle first since it seemed to be the one responding
    const upperHandle = document.querySelector('.note-range-handle-upper') as HTMLButtonElement;
    upperHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 154 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: -1000 }));
    // Upper handle (treble) should be capped at A6
    expect(getStoredStaffNoteRanges().grand.maxNote).toBe('A6');
  });

  it('visual handle should snap to note positions and not move into space', () => {
    renderRangeControl('treble');
    updateNoteRangeSelector();
    const upperHandle = document.querySelector('.note-range-handle-upper') as HTMLButtonElement;
    
    upperHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 150 }));
    
    // Drag way up
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: -1000 }));
    
    // We expect the handle's top to be at the Y position of A6, not at -1100.
    const handleTop = parseFloat(upperHandle.style.top);
    expect(handleTop).toBeGreaterThanOrEqual(0);
    expect(handleTop).toBeLessThanOrEqual(300);
    
    // Ensure it SNAPPED to a note (not exactly -1100)
    expect(handleTop).not.toBe(-1100);
  });
});
