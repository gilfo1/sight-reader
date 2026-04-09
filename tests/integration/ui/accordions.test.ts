import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Accordions UI', () => {
  let html: string;

  beforeEach(() => {
    html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
    document.body.innerHTML = html;
  });

  it('should have a settings accordion', () => {
    const settings = document.getElementById('settings-details');
    expect(settings).not.toBeNull();
    expect(settings?.tagName.toLowerCase()).toBe('details');
    expect(settings?.querySelector('summary')?.textContent).toBe('Settings');
  });

  it('should have a stats accordion', () => {
    const stats = document.getElementById('stats-details');
    expect(stats).not.toBeNull();
    expect(stats?.tagName.toLowerCase()).toBe('details');
    expect(stats?.querySelector('summary')?.textContent).toBe('Stats');
  });

  it('should have a bottom piano keyboard accordion', () => {
    const keyboard = document.getElementById('piano-keyboard-details');
    const summary = keyboard?.querySelector('summary');
    expect(keyboard).not.toBeNull();
    expect(keyboard?.tagName.toLowerCase()).toBe('details');
    expect(summary?.getAttribute('aria-label')).toBe('Keyboard');
    expect(summary?.querySelector('.keyboard-summary-label')?.textContent).toContain('Keyboard');
  });

  it('should use shared summary classes so accordion chevrons render consistently', () => {
    expect(document.querySelector('#settings-details > .panel-summary')).not.toBeNull();
    expect(document.querySelector('#stats-details > .panel-summary')).not.toBeNull();
    expect(document.querySelector('#piano-keyboard-details > .keyboard-summary')).not.toBeNull();
    expect(document.querySelector('#midi-notes-details > .subpanel-summary')).not.toBeNull();
  });

  it('settings and piano accordions should be open by default, stats collapsed', () => {
    const settings = document.getElementById('settings-details') as HTMLDetailsElement;
    const stats = document.getElementById('stats-details') as HTMLDetailsElement;
    const keyboard = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    expect(settings.open).toBe(true);
    expect(stats.open).toBe(false);
    expect(keyboard.open).toBe(true);
  });

  it('settings accordion should contain control elements', () => {
    const controls = document.getElementById('controls');
    expect(controls).not.toBeNull();
    expect(document.getElementById('measures-per-line')).not.toBeNull();
    expect(document.getElementById('staff-type')).not.toBeNull();
  });

  it('stats accordion should contain stats elements', () => {
    expect(document.getElementById('stats-played')).not.toBeNull();
    expect(document.getElementById('stats-correct')).not.toBeNull();
    expect(document.getElementById('stats-wrong')).not.toBeNull();
    expect(document.getElementById('stats-accuracy')).not.toBeNull();
    expect(document.getElementById('stats-streak')).not.toBeNull();
    expect(document.getElementById('stats-max-streak')).not.toBeNull();
    expect(document.getElementById('reset-stats')).not.toBeNull();
  });

  it('should have correct styling for stats (unobtrusive)', () => {
    const stats = document.getElementById('stats-details');
    expect(stats?.classList.contains('panel-muted')).toBe(true);
  });

  it('should place the top accordions inside the responsive panel grid', () => {
    const container = document.querySelector('.panel-grid');
    expect(container).not.toBeNull();
    expect(container?.contains(document.getElementById('settings-details'))).toBe(true);
    expect(container?.contains(document.getElementById('stats-details'))).toBe(true);
  });

  describe('Settings Accordion Functionality', () => {
    it('should allow toggling settings accordion', () => {
      const settings = document.getElementById('settings-details') as HTMLDetailsElement;
      expect(settings.open).toBe(true);
      settings.open = false;
      expect(settings.open).toBe(false);
      settings.open = true;
      expect(settings.open).toBe(true);
    });

    it('should have all expected select elements in settings', () => {
      const ids = [
        'measures-per-line', 'lines', 'staff-type', 'notes-per-step', 'min-note', 'max-note'
      ];
      ids.forEach(id => {
        expect(document.getElementById(id), `Missing element ${id}`).not.toBeNull();
      });
    });

    it('should have note value checkboxes in settings', () => {
      const container = document.getElementById('note-values');
      const checkboxes = container?.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes?.length).toBeGreaterThan(0);
      const values = Array.from(checkboxes || []).map(cb => (cb as HTMLInputElement).value);
      expect(values).toContain('w');
      expect(values).toContain('q');
    });
  });
});
