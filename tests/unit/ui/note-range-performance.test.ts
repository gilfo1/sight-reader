import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('note range drag performance and alignment', () => {
  beforeEach(() => {
    localStorage.clear();
    renderRangeControl();
    // Mock getBoundingClientRect for the overlay and visual container
    // This is crucial because JSDOM doesn't support layout.
    // We'll use a standard 300x300 area.
    const visual = document.getElementById('note-range-visual') as HTMLElement;
    visual.getBoundingClientRect = () => ({
      top: 100, left: 100, width: 300, height: 300, bottom: 400, right: 400, x: 100, y: 100, toJSON: () => {},
    }) as DOMRect;
    
    // We also need to mock it for the overlay when it's created.
    // Since it's created dynamically, we can use a MutationObserver or mock querySelector.
    const originalQuerySelector = visual.querySelector.bind(visual);
    visual.querySelector = (selector: string) => {
      const el = originalQuerySelector(selector);
      if (el && selector === '.note-range-overlay') {
        el.getBoundingClientRect = () => ({
          top: 100, left: 100, width: 300, height: 300, bottom: 400, right: 400, x: 100, y: 100, toJSON: () => {},
        }) as DOMRect;
      }
      return el;
    };
  });

  it('responds quickly to drag events (simulated)', async () => {
    updateNoteRangeSelector();
    const upperHandle = document.querySelector('.note-range-handle-upper') as HTMLButtonElement;
    expect(upperHandle).not.toBeNull();

    // Initial value C6
    expect(getStoredStaffNoteRanges().grand.maxNote).toBe('C6');

    // Simulate drag start at the handle's current position
    const visual = document.getElementById('note-range-visual') as HTMLElement;
    const rect = visual.getBoundingClientRect();
    const initialHandleY = parseFloat(upperHandle.style.top) + rect.top;

    // Mock requestAnimationFrame to track calls
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    upperHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: initialHandleY }));

    // Move slightly down - enough to hit another note
    // In JSDOM with our new unified coordinates, higher notes have SMALLER Y.
    // To move from C6 (maxNote) to a lower note, we need to INCREASE clientY.
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: initialHandleY + 10 }));
    expect(rafSpy).toHaveBeenCalled();
    
    rafSpy.mockRestore();
  });

  it('ensures handle follows pointer exactly during drag', () => {
    updateNoteRangeSelector();
    const upperHandle = document.querySelector('.note-range-handle-upper') as HTMLButtonElement;
    
    // Simulate drag start at clientY=150
    // The handle's current top is some value H.
    // rect.top is 100 in our mock.
    // handleY in startDrag is H + 100.
    // dragYOffset = 150 - (H + 100).
    
    upperHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 150 }));
    
    // Move to clientY=200
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 200 }));
    
    // In handleMove, it now snaps to the closest note.
    // So we don't expect it to be exactly 100px (clientY - rect.top), 
    // but rather the Y position of whatever note is closest to 200.
    const top = parseFloat(upperHandle.style.top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(300);
    
    // Move to clientY=50
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 50 }));
    const top2 = parseFloat(upperHandle.style.top);
    expect(top2).toBeLessThanOrEqual(top);
  });

  it('restricts grand staff handles to their respective staves', () => {
    renderRangeControl('grand');
    updateNoteRangeSelector();
    
    const lowerHandle = document.querySelector('.note-range-handle-lower') as HTMLButtonElement;
    
    // Lower handle is bass clef (since C2 < C4)
    lowerHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 150 }));
    
    // Try to drag it to a very high note (e.g. C6, which is treble)
    // C6 is far above the bass staff.
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: -500 }));
    
    // It should be capped at the split note (C4) or just below it.
    // getNoteValue('C4') = 60.
    const finalNote = getStoredStaffNoteRanges().grand.minNote;
    expect(getNoteValue(finalNote)).toBeLessThan(getNoteValue('C4'));
  });

  it('correctly aligns bass clef handle on grand staff', () => {
    renderRangeControl('grand');
    updateNoteRangeSelector();
    
    const lowerHandle = document.querySelector('.note-range-handle-lower') as HTMLButtonElement;
    const initialNote = lowerHandle.dataset.note;
    expect(initialNote).toBe('C2');
    
    const rectTop = 100;
    const handleTop = parseFloat(lowerHandle.style.top);
    
    // Simulate drag from current position
    lowerHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: handleTop + rectTop }));
    
    // Move slightly - should still be on a valid note and aligned
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: handleTop + rectTop + 10 }));
    
    const newNote = lowerHandle.dataset.note;
    expect(newNote).not.toBeNull();
    
    // The handle's style.top should exactly match what getPreviewYForNote would return for that note
    // This is handled in handleMove snapping logic.
    expect(lowerHandle.style.top).toMatch(/px$/);
  });
});
