import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { generateScoreData, initApp, resetGameState } from '@/main';
import { getEffectiveUIConfig, getUIConfig } from '@/ui/controls';
import { getNoteValue } from '@/utils/theory';

describe('On-Screen Piano Keyboard Range Override', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameState();
    const html = readFileSync('./index.html', 'utf-8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    Array.from(doc.body.attributes).forEach((attribute) => {
      document.body.setAttribute(attribute.name, attribute.value);
    });
    window.confirm = vi.fn().mockReturnValue(true);
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map(),
    });
  });

  function collectPitches() {
    const music = generateScoreData();
    return music.flatMap((measure) => [...measure.trebleSteps.flat(), ...measure.bassSteps.flat()]);
  }

  it('forces the effective note range to the keyboard range while open', async () => {
    await initApp();

    const minNote = document.getElementById('min-note') as HTMLSelectElement;
    const maxNote = document.getElementById('max-note') as HTMLSelectElement;
    minNote.value = 'A0';
    maxNote.value = 'C8';

    expect(getUIConfig().minNote).toBe('A0');
    expect(getUIConfig().maxNote).toBe('C8');
    expect(getEffectiveUIConfig().minNote).toBe('C3');
    expect(getEffectiveUIConfig().maxNote).toBe('F5');
  });

  it('restores the settings range when the keyboard accordion is closed', async () => {
    await initApp();

    const minNote = document.getElementById('min-note') as HTMLSelectElement;
    const maxNote = document.getElementById('max-note') as HTMLSelectElement;
    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    minNote.value = 'A0';
    maxNote.value = 'C8';
    keyboardDetails.open = false;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    expect(getEffectiveUIConfig().minNote).toBe('A0');
    expect(getEffectiveUIConfig().maxNote).toBe('C8');
  });

  it('generates only keyboard-playable notes while the keyboard is open', async () => {
    await initApp();

    const pitches = collectPitches();
    pitches.forEach((pitch) => {
      expect(getNoteValue(pitch)).toBeGreaterThanOrEqual(getNoteValue('C3'));
      expect(getNoteValue(pitch)).toBeLessThanOrEqual(getNoteValue('F5'));
    });
  });

  it('returns to the configured range after the keyboard is closed', async () => {
    await initApp();

    const minNote = document.getElementById('min-note') as HTMLSelectElement;
    const maxNote = document.getElementById('max-note') as HTMLSelectElement;
    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    minNote.value = 'A0';
    maxNote.value = 'B0';
    keyboardDetails.open = false;
    keyboardDetails.dispatchEvent(new Event('toggle'));

    const pitches = collectPitches();
    expect(pitches.every((pitch) => getNoteValue(pitch) <= getNoteValue('B0'))).toBe(true);
  });
});
