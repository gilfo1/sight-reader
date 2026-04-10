import { beforeEach, describe, expect, it } from 'vitest';
import { getNoteValue } from '@/utils/theory';
import {
  clampNoteRangeForStaff,
  getAvailableRangeForStaff,
  getPreviewStaffNotes,
  getStoredStaffNoteRanges,
  noteRequiresLedgerLines,
  setCurrentStaffNoteRange,
  updateNoteRangeSelector,
} from '@/ui/note-range';

function renderRangeControl(staffType = 'grand'): void {
  document.body.innerHTML = `
    <select id="staff-type">
      <option value="grand" ${staffType === 'grand' ? 'selected' : ''}>Grand Staff</option>
      <option value="treble" ${staffType === 'treble' ? 'selected' : ''}>Treble Clef</option>
      <option value="bass" ${staffType === 'bass' ? 'selected' : ''}>Bass Clef</option>
    </select>
    <div id="note-range-selector">
      <span id="note-range-selected-staff"></span>
      <div id="note-range-visual"></div>
      <div id="note-range-value-summary"></div>
    </div>
    <input id="min-note" type="hidden" value="C2">
    <input id="max-note" type="hidden" value="C6">
  `;
}

describe('note range selector', () => {
  beforeEach(() => {
    localStorage.clear();
    renderRangeControl();
  });

  it('returns staff-specific available note ranges', () => {
    expect(getAvailableRangeForStaff('grand')[0]).toBe('A0');
    expect(getAvailableRangeForStaff('grand').at(-1)).toBe('C8');
    expect(getAvailableRangeForStaff('treble')[0]).toBe('C3');
    expect(getAvailableRangeForStaff('treble').at(-1)).toBe('C6');
    expect(getAvailableRangeForStaff('bass')[0]).toBe('C1');
    expect(getAvailableRangeForStaff('bass').at(-1)).toBe('C5');
  });

  it('clamps invalid or reversed ranges back into the staff bounds', () => {
    expect(clampNoteRangeForStaff('treble', { minNote: 'A0', maxNote: 'C8' })).toEqual({
      minNote: 'C3',
      maxNote: 'C6',
    });

    expect(clampNoteRangeForStaff('bass', { minNote: 'C5', maxNote: 'C1' })).toEqual({
      minNote: 'C1',
      maxNote: 'C5',
    });
  });

  it('renders the default grand staff range into the hidden inputs and label', () => {
    updateNoteRangeSelector();

    expect((document.getElementById('min-note') as HTMLInputElement).value).toBe('C2');
    expect((document.getElementById('max-note') as HTMLInputElement).value).toBe('C6');
    expect((document.getElementById('note-range-selected-staff') as HTMLElement).textContent).toBe('Grand staff range');
    const svg = document.querySelector('#note-range-visual svg');
    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll('.vf-clef').length).toBe(2);
    expect(svg?.querySelectorAll('.vf-stavenote').length).toBe(2);
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(4);
    expect((document.getElementById('note-range-value-summary') as HTMLElement).textContent).toBe('c2 - c6');
    expect(document.querySelectorAll('.note-range-handle')).toHaveLength(2);
  });

  it('renders a single treble staff preview with one chord and two handles', () => {
    const staffType = document.getElementById('staff-type') as HTMLSelectElement;
    staffType.value = 'treble';

    updateNoteRangeSelector();

    const svg = document.querySelector('#note-range-visual svg');
    expect(svg?.querySelectorAll('.vf-clef').length).toBe(1);
    expect(svg?.querySelectorAll('.vf-stavenote').length).toBe(2);
    expect(document.querySelectorAll('.note-range-handle')).toHaveLength(2);
  });

  it('renders a single bass staff preview with one chord and two handles', () => {
    const staffType = document.getElementById('staff-type') as HTMLSelectElement;
    staffType.value = 'bass';

    updateNoteRangeSelector();

    const svg = document.querySelector('#note-range-visual svg');
    expect(svg?.querySelectorAll('.vf-clef').length).toBe(1);
    expect(svg?.querySelectorAll('.vf-stavenote').length).toBe(2);
    expect(document.querySelectorAll('.note-range-handle')).toHaveLength(2);
  });

  it('stacks the lower and upper notes on the same beat for each rendered staff', () => {
    const staffType = document.getElementById('staff-type') as HTMLSelectElement;
    staffType.value = 'bass';
    updateNoteRangeSelector();

    const lowerHandles = Array.from(document.querySelectorAll('.note-range-handle-lower')) as HTMLButtonElement[];
    const upperHandles = Array.from(document.querySelectorAll('.note-range-handle-upper')) as HTMLButtonElement[];

    expect(lowerHandles).toHaveLength(1);
    expect(upperHandles).toHaveLength(1);

    lowerHandles.forEach((lowerHandle, index) => {
      const upperHandle = upperHandles[index]!;
      const lowerLeft = Number.parseFloat(lowerHandle.style.left);
      const upperLeft = Number.parseFloat(upperHandle.style.left);
      expect(Math.abs(lowerLeft - upperLeft)).toBeLessThan(2);
    });
  });

  it('positions rendered note handles inside the preview viewport', () => {
    updateNoteRangeSelector();

    const handles = Array.from(document.querySelectorAll('.note-range-handle')) as HTMLButtonElement[];

    expect(handles.length).toBe(2);

    handles.forEach((handle) => {
      const top = Number.parseFloat(handle.style.top);
      expect(top).toBeGreaterThan(0);
      expect(top).toBeLessThan(280);
    });
  });

  it('assigns grand-staff preview notes to the correct clefs', () => {
    expect(getPreviewStaffNotes('grand', { minNote: 'C2', maxNote: 'C6' })).toEqual({
      bass: ['C2'],
      treble: ['C6'],
    });
    expect(getPreviewStaffNotes('grand', { minNote: 'E4', maxNote: 'A4' })).toEqual({
      bass: [],
      treble: ['E4', 'A4'],
    });
  });

  it('only requires ledger lines when notes are outside the five staff lines', () => {
    expect(noteRequiresLedgerLines('treble', 'E4')).toBe(false);
    expect(noteRequiresLedgerLines('treble', 'F5')).toBe(false);
    expect(noteRequiresLedgerLines('treble', 'C6')).toBe(true);
    expect(noteRequiresLedgerLines('bass', 'G2')).toBe(false);
    expect(noteRequiresLedgerLines('bass', 'A3')).toBe(false);
    expect(noteRequiresLedgerLines('bass', 'C1')).toBe(true);
  });

  it('updates and persists the active staff range', () => {
    updateNoteRangeSelector();
    setCurrentStaffNoteRange({ minNote: 'E2', maxNote: 'G5' });

    expect((document.getElementById('min-note') as HTMLInputElement).value).toBe('E2');
    expect((document.getElementById('max-note') as HTMLInputElement).value).toBe('G5');
    expect(getStoredStaffNoteRanges().grand).toEqual({ minNote: 'E2', maxNote: 'G5' });
  });

  it('remembers separate ranges for each staff type', () => {
    updateNoteRangeSelector();
    setCurrentStaffNoteRange({ minNote: 'D2', maxNote: 'F5' });

    const staffType = document.getElementById('staff-type') as HTMLSelectElement;
    staffType.value = 'treble';
    updateNoteRangeSelector();
    setCurrentStaffNoteRange({ minNote: 'E3', maxNote: 'A5' });

    staffType.value = 'bass';
    updateNoteRangeSelector();
    setCurrentStaffNoteRange({ minNote: 'D1', maxNote: 'B2' });

    staffType.value = 'grand';
    updateNoteRangeSelector();
    expect((document.getElementById('min-note') as HTMLInputElement).value).toBe('D2');
    expect((document.getElementById('max-note') as HTMLInputElement).value).toBe('F5');

    staffType.value = 'treble';
    updateNoteRangeSelector();
    expect((document.getElementById('min-note') as HTMLInputElement).value).toBe('E3');
    expect((document.getElementById('max-note') as HTMLInputElement).value).toBe('A5');
  });

  it('keeps the lower note from moving above the upper note during drag', () => {
    updateNoteRangeSelector();

    const lowerHandle = document.querySelector('.note-range-handle-lower') as HTMLButtonElement;

    lowerHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 20 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(getNoteValue((document.getElementById('min-note') as HTMLInputElement).value))
      .toBeLessThanOrEqual(getNoteValue((document.getElementById('max-note') as HTMLInputElement).value));
  });

  it('moves the upper note when its handle is dragged upward', () => {
    updateNoteRangeSelector();

    const upperHandle = document.querySelector('.note-range-handle-upper') as HTMLButtonElement;
    upperHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 80 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 30 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(getNoteValue((document.getElementById('max-note') as HTMLInputElement).value)).toBeGreaterThanOrEqual(getNoteValue('F5'));
    expect(getStoredStaffNoteRanges().grand.maxNote).toBe((document.getElementById('max-note') as HTMLInputElement).value);
  });

  it('keeps bass and treble grand-staff handles wired to the same stored range bounds', () => {
    updateNoteRangeSelector();

    const lowerHandles = Array.from(document.querySelectorAll('.note-range-handle-lower')) as HTMLButtonElement[];
    const upperHandles = Array.from(document.querySelectorAll('.note-range-handle-upper')) as HTMLButtonElement[];

    expect(lowerHandles).toHaveLength(1);
    expect(upperHandles).toHaveLength(1);
    expect(new Set(lowerHandles.map((handle) => handle.dataset.note))).toEqual(new Set(['C2']));
    expect(new Set(upperHandles.map((handle) => handle.dataset.note))).toEqual(new Set(['C6']));
    expect(lowerHandles[0]?.dataset.clef).toBe('bass');
    expect(upperHandles[0]?.dataset.clef).toBe('treble');
  });
});
