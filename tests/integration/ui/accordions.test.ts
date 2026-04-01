import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Accordions UI', () => {
  let html: string;

  beforeEach(() => {
    html = fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
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

  it('both accordions should be collapsed by default', () => {
    const settings = document.getElementById('settings-details') as HTMLDetailsElement;
    const stats = document.getElementById('stats-details') as HTMLDetailsElement;
    expect(settings.open).toBe(false);
    expect(stats.open).toBe(false);
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
    const style = stats?.getAttribute('style');
    // Check for color greyed (#777 or equivalent)
    expect(style).toMatch(/color:\s*(#777|rgb\(119,\s*119,\s*119\))/);
  });

  it('should have a wrapping flex container for accordions to allow stacking', () => {
    const settings = document.getElementById('settings-details');
    const container = settings?.parentElement;
    expect(container).not.toBeNull();
    const style = container?.getAttribute('style');
    expect(style).toContain('display: flex');
    expect(style).toContain('flex-wrap: wrap');
    expect(style).toContain('justify-content: center');
  });

  describe('Settings Accordion Functionality', () => {
    it('should allow toggling settings accordion', () => {
      const settings = document.getElementById('settings-details') as HTMLDetailsElement;
      expect(settings.open).toBe(false);
      settings.open = true;
      expect(settings.open).toBe(true);
      settings.open = false;
      expect(settings.open).toBe(false);
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
