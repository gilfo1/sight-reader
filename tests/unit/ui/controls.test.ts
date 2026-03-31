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
  });

  it('should extract config from UI correctly', () => {
    const config = getUIConfig();
    expect(config.measuresPerLine).toBe(4);
    expect(config.staffType).toBe('grand');
    expect(config.selectedNoteValues).toContain('q');
    expect(config.selectedKeySignatures).toContain('C');
  });
});
