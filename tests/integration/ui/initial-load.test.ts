import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('Initial DOM Structure', () => {
  let doc: Document;

  beforeEach(() => {
    const html = readFileSync('./index.html', 'utf-8');
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  });

  it('should have a centered main body', () => {
    const body = doc.body;
    expect(body.style.display).toBe('flex');
    expect(body.style.flexDirection).toBe('column');
    expect(body.style.alignItems).toBe('center');
  });

  it('should have a Settings accordion', () => {
    const details = doc.querySelector('details')!;
    const summary = details.querySelector('summary')!;
    expect(summary.textContent).toBe('Settings');
    expect(doc.getElementById('controls')).not.toBeNull();
  });

  it('should have all musical configuration selectors', () => {
    const ids = [
      'measures-per-line', 'lines', 'staff-type', 
      'notes-per-step', 'min-note', 'max-note'
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
    expect(doc.getElementById('midi-device-name')).not.toBeNull();
    expect(doc.getElementById('midi-indicator')).not.toBeNull();
    expect(doc.getElementById('midi-notes-details')).not.toBeNull();
    expect(doc.getElementById('current-note')).not.toBeNull();
  });
});
