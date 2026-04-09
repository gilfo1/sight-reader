import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadAccordionState,
  resetAccordionState,
  saveAccordionState,
} from '@/ui/controls';

describe('Accordion State Helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <details id="settings-details" open></details>
      <details id="stats-details"></details>
    `;
  });

  it('saves and reloads accordion open state', () => {
    const settings = document.getElementById('settings-details') as HTMLDetailsElement;
    const stats = document.getElementById('stats-details') as HTMLDetailsElement;

    settings.open = false;
    stats.open = true;
    saveAccordionState();

    settings.open = true;
    stats.open = false;
    loadAccordionState();

    expect(settings.open).toBe(false);
    expect(stats.open).toBe(true);
  });

  it('resets accordions to the default layout', () => {
    const settings = document.getElementById('settings-details') as HTMLDetailsElement;
    const stats = document.getElementById('stats-details') as HTMLDetailsElement;

    settings.open = false;
    stats.open = true;
    resetAccordionState();

    expect(settings.open).toBe(true);
    expect(stats.open).toBe(false);
  });
});
