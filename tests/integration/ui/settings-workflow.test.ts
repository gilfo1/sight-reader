import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as main from '../../../src/main';
import * as controls from '../../../src/ui/controls';

describe('Settings Workflow Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="measures-per-line">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4" selected>4</option>
      </select>
      <select id="lines">
        <option value="1" selected>1</option>
        <option value="2">2</option>
      </select>
      <select id="staff-type">
        <option value="grand" selected>Grand Staff</option>
        <option value="treble">Treble Clef</option>
        <option value="bass">Bass Clef</option>
      </select>
      <select id="notes-per-step">
        <option value="1" selected>1</option>
        <option value="2">2</option>
      </select>
      <select id="min-note"></select>
      <select id="max-note"></select>
      <div id="note-values">
        <input type="checkbox" value="q" checked>
      </div>
      <div id="key-signatures">
        <input type="checkbox" value="C" checked>
      </div>
      <div id="output"></div>
      <div id="stats-played">0</div>
      <div id="stats-correct">0</div>
      <div id="stats-wrong">0</div>
      <div id="stats-accuracy">0%</div>
      <div id="stats-streak">0</div>
      <div id="stats-max-streak">0</div>
      <button id="reset-stats">Reset</button>
    `;

    // Initialize UI
    controls.updateNoteSelectors();
  });

  it('should trigger config change and regeneration when a setting is changed', () => {
    const onConfigChange = vi.fn();
    controls.setupEventListeners(onConfigChange);

    const select = document.getElementById('measures-per-line') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));

    expect(onConfigChange).toHaveBeenCalled();
  });

  it('should update note selectors when staff type changes', () => {
    const onConfigChange = vi.fn();
    controls.setupEventListeners(onConfigChange);

    const staffSelect = document.getElementById('staff-type') as HTMLSelectElement;
    const minNote = document.getElementById('min-note') as HTMLSelectElement;
    
    // Initial (grand)
    expect(minNote.value).toBe('C2');

    staffSelect.value = 'treble';
    staffSelect.dispatchEvent(new Event('change'));

    expect(onConfigChange).toHaveBeenCalled();
    // In treble, min note should be C3
    expect(minNote.value).toBe('C3');
  });

  it('should trigger config change when note value is toggled', () => {
    const onConfigChange = vi.fn();
    controls.setupEventListeners(onConfigChange);

    const checkbox = document.querySelector('#note-values input') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    expect(onConfigChange).toHaveBeenCalled();
  });
});
