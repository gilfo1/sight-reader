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
      <details id="stats-details"></details>
      <details id="piano-keyboard-details" open></details>
    `;
  });

  it('saves and reloads accordion open state', () => {
    const stats = document.getElementById('stats-details') as HTMLDetailsElement;
    const keyboard = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;

    stats.open = true;
    keyboard.open = false;
    saveAccordionState();

    stats.open = false;
    keyboard.open = true;
    loadAccordionState();

    expect(stats.open).toBe(true);
    expect(keyboard.open).toBe(false);
  });

  it('resets accordions to the default layout', () => {
    const stats = document.getElementById('stats-details') as HTMLDetailsElement;
    const keyboard = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;

    stats.open = true;
    keyboard.open = false;
    resetAccordionState();

    expect(stats.open).toBe(false);
    expect(keyboard.open).toBe(true);
  });
});
