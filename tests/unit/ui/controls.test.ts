import { describe, it, expect, beforeEach } from 'vitest';
import { updateNoteSelectors, getUIConfig } from '../../../src/ui/controls';

describe('UI Controls', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="staff-type">
        <option value="treble">Treble</option>
        <option value="bass">Bass</option>
        <option value="grand" selected>Grand Staff</option>
      </select>
      <select id="min-note"></select>
      <select id="max-note"></select>
      <select id="measures-per-line"><option value="4">4</option></select>
      <select id="notes-per-step"><option value="1">1</option></select>
      <select id="lines"><option value="1">1</option></select>
      <div id="note-values">
        <input type="checkbox" value="q" checked>
      </div>
      <div id="key-signatures">
        <input type="checkbox" value="C" checked>
      </div>
    `;
  });

  it('should update note selectors based on staff type', () => {
    updateNoteSelectors();
    const minSelect: any = document.getElementById('min-note');
    const maxSelect: any = document.getElementById('max-note');
    
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
    // It should preserve C3 because C3 is in bass range (C1-C5)
    expect(minSelect.value).toBe('C3');

    // Now set something out of range for bass, then switch to bass
    (document.getElementById('staff-type') as any).value = 'treble';
    updateNoteSelectors();
    minSelect.value = 'C6'; // C6 is in treble, not in bass
    (document.getElementById('staff-type') as any).value = 'bass';
    updateNoteSelectors();
    expect(minSelect.value).toBe('C1');
  });

  it('should preserve selected note if it is still within range when staff type changes', () => {
    (document.getElementById('staff-type') as any).value = 'grand';
    updateNoteSelectors();
    const minSelect: any = document.getElementById('min-note');
    minSelect.value = 'E2';
    
    (document.getElementById('staff-type') as any).value = 'bass';
    updateNoteSelectors();
    // E2 is valid in bass (C1-C5), so it should be preserved
    expect(minSelect.value).toBe('E2');
  });

  it('should extract config from UI correctly', () => {
    const config = getUIConfig();
    expect(config.measuresPerLine).toBe(4);
    expect(config.staffType).toBe('grand');
    expect(config.selectedNoteValues).toContain('q');
    expect(config.selectedKeySignatures).toContain('C');
    expect(config.isChromatic).toBe(false);
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
