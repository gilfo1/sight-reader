import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('Initial DOM Structure', () => {
  let doc: Document;

  beforeEach(() => {
    const html = readFileSync('./index.html', 'utf-8');
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  });

  it('should have the responsive shell classes', () => {
    const body = doc.body;
    expect(body.classList.contains('app-shell')).toBe(true);
    expect(doc.querySelector('.app-main')).not.toBeNull();
    expect(doc.querySelector('.app-toolbar')).not.toBeNull();
    expect(doc.querySelector('.panel-grid')).not.toBeNull();
  });

  it('should have a settings menu button and modal', () => {
    const menuButton = doc.getElementById('settings-menu-toggle');
    const modal = doc.getElementById('settings-modal');
    expect(menuButton).not.toBeNull();
    expect(modal).not.toBeNull();
    expect(menuButton?.getAttribute('aria-controls')).toBe('settings-modal');
    expect(doc.getElementById('controls')).not.toBeNull();
  });

  it('should have all musical configuration selectors', () => {
    const ids = [
      'measures-per-line', 'lines', 'staff-type', 
      'notes-per-step', 'min-note', 'max-note', 'note-range-selector', 'note-range-visual'
    ];
    ids.forEach(id => {
      expect(doc.getElementById(id)).not.toBeNull();
    });
  });

  it('should have note value checkboxes', () => {
    const container = doc.getElementById('note-values')!;
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('should have MIDI status and note display elements', () => {
    expect(doc.getElementById('midi-status')).not.toBeNull();
    expect(doc.getElementById('sound-toggle')).not.toBeNull();
    expect(doc.getElementById('sound-toggle-icon')).not.toBeNull();
    expect(doc.getElementById('settings-modal-close')).not.toBeNull();
    expect(doc.getElementById('settings-modal-backdrop')).not.toBeNull();
    expect(doc.getElementById('midi-device-name')).not.toBeNull();
    expect(doc.getElementById('midi-indicator')).not.toBeNull();
    expect(doc.getElementById('midi-notes-details')).not.toBeNull();
    expect(doc.getElementById('current-note')).not.toBeNull();
    expect(doc.getElementById('piano-keyboard-details')).not.toBeNull();
    expect(doc.getElementById('piano-keyboard')).not.toBeNull();
    expect(doc.querySelector('.output-shell')).not.toBeNull();
  });
});
