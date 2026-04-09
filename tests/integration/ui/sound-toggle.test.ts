import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { initApp, resetGameState } from '@/main';
import { isSoundEnabled } from '@/audio/note-player';

describe('Sound Toggle UI', () => {
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

  it('renders a speaker control in the top-right utility row', async () => {
    await initApp();

    const utilityRow = document.querySelector('.utility-row');
    const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    const soundIcon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    expect(utilityRow).not.toBeNull();
    expect(soundToggle.dataset.enabled).toBe('true');
    expect(soundToggle.getAttribute('aria-label')).toBe('Turn sound off');
    expect(soundIcon.classList.contains('sound-icon')).toBe(true);
    expect(soundIcon.dataset.enabled).toBe('true');
    expect(soundIcon.querySelector('.sound-icon-speaker')).not.toBeNull();
    expect(soundIcon.querySelectorAll('.sound-icon-wave')).toHaveLength(2);
  });

  it('toggles sound state, icon, and persistence', async () => {
    await initApp();

    const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    const soundIcon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    soundToggle.click();
    expect(isSoundEnabled()).toBe(false);
    expect(soundToggle.dataset.enabled).toBe('false');
    expect(soundIcon.dataset.enabled).toBe('false');
    expect(soundIcon.querySelector('.sound-icon-mute-slash')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem('sound-enabled') ?? 'true')).toBe(false);

    soundToggle.click();
    expect(isSoundEnabled()).toBe(true);
    expect(soundIcon.dataset.enabled).toBe('true');
  });
});
