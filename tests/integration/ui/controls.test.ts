import { describe, it, expect, beforeEach } from 'vitest';
import { updateNoteSelectors, getUIConfig } from '@/ui/controls';
import { setCurrentStaffNoteRange } from '@/ui/note-range';

describe('UI Controls', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <select id="staff-type">
        <option value="treble">Treble</option>
        <option value="bass">Bass</option>
        <option value="grand" selected>Grand Staff</option>
      </select>
      <div id="note-range-selector">
        <span id="note-range-selected-staff"></span>
        <div id="note-range-visual"></div>
        <div id="note-range-value-summary"></div>
      </div>
      <input id="min-note" type="hidden" value="C2">
      <input id="max-note" type="hidden" value="C6">
      <select id="measures-per-line"><option value="4">4</option></select>
      <select id="notes-per-step"><option value="1">1</option></select>
      <select id="lines"><option value="1">1</option></select>
      <select id="max-reach">
        <option value="5">-8 (Major Third / 4 half steps)</option>
        <option value="6">-7 (Perfect Fourth / 5 half steps)</option>
        <option value="7">-6 (Tritone / 6 half steps)</option>
        <option value="8">-5 (Perfect Fifth / 7 half steps)</option>
        <option value="9">-4 (Minor Sixth / 8 half steps)</option>
        <option value="10">-3 (Major Sixth / 9 half steps)</option>
        <option value="11">-2 (Minor Seventh / 10 half steps)</option>
        <option value="12">-1 (Major Seventh / 11 half steps)</option>
        <option value="13" selected>0 (Octave / 12 half steps)</option>
        <option value="14">+1 (Minor Ninth / 13 half steps)</option>
        <option value="15">+2 (Major Ninth / 14 half steps)</option>
        <option value="16">+3 (Minor Tenth / 15 half steps)</option>
        <option value="17">+4 (Major Tenth / 16 half steps)</option>
        <option value="18">+5 (Perfect Eleventh / 17 half steps)</option>
        <option value="19">+6 (Augmented Eleventh / 18 half steps)</option>
        <option value="20">+7 (Perfect Twelfth / 19 half steps)</option>
      </select>
      <div id="note-values">
        <input type="checkbox" value="q" checked>
      </div>
      <div id="key-signatures">
        <input type="checkbox" value="C" checked>
      </div>
      <input type="checkbox" id="adaptive-learning">
    `;
  });

  it('should update note selectors based on staff type', () => {
    updateNoteSelectors();
    const minSelect = document.getElementById('min-note') as HTMLInputElement;
    const maxSelect = document.getElementById('max-note') as HTMLInputElement;
    
    // Default for Grand Staff is C2 - C6
    expect(minSelect.value).toBe('C2');
    expect(maxSelect.value).toBe('C6');

    (document.getElementById('staff-type') as any).value = 'treble';
    updateNoteSelectors();
    // Treble range is restricted
    expect(minSelect.value).toBe('C3');
    expect(maxSelect.value).toBe('C6');

    (document.getElementById('staff-type') as any).value = 'bass';
    updateNoteSelectors();
    expect(minSelect.value).toBe('C1');
    expect(maxSelect.value).toBe('C5');
  });

  it('should remember each staff type range separately', () => {
    (document.getElementById('staff-type') as any).value = 'grand';
    updateNoteSelectors();
    const minSelect = document.getElementById('min-note') as HTMLInputElement;
    const maxSelect = document.getElementById('max-note') as HTMLInputElement;

    setCurrentStaffNoteRange({ minNote: 'E1', maxNote: 'E5' });

    (document.getElementById('staff-type') as any).value = 'bass';
    updateNoteSelectors();
    expect(minSelect.value).toBe('C1');
    expect(maxSelect.value).toBe('C5');

    (document.getElementById('staff-type') as any).value = 'grand';
    updateNoteSelectors();
    expect(minSelect.value).toBe('E1');
    expect(maxSelect.value).toBe('E5');
  });

  it('should extract config from UI correctly', () => {
    updateNoteSelectors();
    const config = getUIConfig();
    expect(config.measuresPerLine).toBe(4);
    expect(config.staffType).toBe('grand');
    expect(config.selectedNoteValues).toContain('q');
    expect(config.selectedKeySignatures).toContain('C');
    expect(config.maxReach).toBe(13);
    expect(config.isChromatic).toBe(false);
    expect(config.isAdaptive).toBe(false);
    expect(config.minNote).toBe('C2');
    expect(config.maxNote).toBe('C6');
  });

  it('should have all expected max reach options in the UI', () => {
    const maxReachSelect = document.getElementById('max-reach') as HTMLSelectElement;
    const values = Array.from(maxReachSelect.options).map(opt => opt.value);
    const expectedValues = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
    expect(values).toEqual(expectedValues);
    
    expect(maxReachSelect.value).toBe('13'); // Default is now 13 (Octave)
  });

  it('should extract adaptive learning setting correctly', () => {
    const cb = document.getElementById('adaptive-learning') as HTMLInputElement;
    cb.checked = true;
    const config = getUIConfig();
    expect(config.isAdaptive).toBe(true);
  });

  it('should handle chromatic checkbox in getUIConfig', () => {
    (document.getElementById('key-signatures') as any).innerHTML = `
      <input type="checkbox" value="C">
      <input type="checkbox" value="Chromatic" checked>
    `;
    const config = getUIConfig();
    expect(config.isChromatic).toBe(true);
    expect(config.selectedKeySignatures).toContain('Chromatic');
  });

  it('should fallback to default note values if none are checked', () => {
    const checkboxes = document.querySelectorAll('#note-values input[type="checkbox"]');
    checkboxes.forEach(cb => (cb as HTMLInputElement).checked = false);
    
    const config = getUIConfig();
    expect(config.selectedNoteValues).toEqual(['q']);
  });
});
