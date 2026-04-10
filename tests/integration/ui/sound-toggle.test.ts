import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { initApp, resetGameState } from '@/main';
import { getSoundMode, isSoundEnabled } from '@/audio/note-player';
import { SOUND_MODE } from '@/audio/sound-mode';

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

    const toolbar = document.querySelector('.app-toolbar');
    const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    const soundIcon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    expect(toolbar).not.toBeNull();
    expect(soundToggle.dataset.enabled).toBe('true');
    expect(soundToggle.dataset.soundMode).toBe(SOUND_MODE.ON);
    expect(soundToggle.getAttribute('aria-label')).toBe('Sound on');
    expect(soundIcon.classList.contains('sound-icon')).toBe(true);
    expect(soundIcon.dataset.enabled).toBe('true');
    expect(soundIcon.dataset.soundMode).toBe(SOUND_MODE.ON);
    expect(soundIcon.querySelector('.sound-icon-speaker')).not.toBeNull();
    expect(soundIcon.querySelectorAll('.sound-icon-wave')).toHaveLength(2);
    expect(soundIcon.querySelector('.sound-icon-wave-primary')).not.toBeNull();
    expect(soundIcon.querySelector('.sound-icon-wave-secondary')).not.toBeNull();
    expect(soundIcon.querySelector('.sound-icon-reverb-badge')).not.toBeNull();
    expect(soundIcon.querySelectorAll('.sound-icon-reverb-ring')).toHaveLength(2);
    expect(soundIcon.querySelector('.sound-icon-mute-slash')).not.toBeNull();
  });

  it('toggles sound state, icon, and persistence', async () => {
    await initApp();

    const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    const soundIcon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    soundToggle.click();
    expect(isSoundEnabled()).toBe(true);
    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
    expect(soundToggle.dataset.soundMode).toBe(SOUND_MODE.REVERB);
    expect(soundIcon.dataset.soundMode).toBe(SOUND_MODE.REVERB);
    expect(soundToggle.getAttribute('aria-label')).toBe('Sound on with reverb');
    expect(JSON.parse(localStorage.getItem('sound-mode') ?? 'null')).toBe(SOUND_MODE.REVERB);

    soundToggle.click();
    expect(isSoundEnabled()).toBe(false);
    expect(getSoundMode()).toBe(SOUND_MODE.OFF);
    expect(soundToggle.dataset.enabled).toBe('false');
    expect(soundIcon.dataset.enabled).toBe('false');
    expect(soundToggle.getAttribute('aria-label')).toBe('Sound off');
    expect(soundIcon.querySelector('.sound-icon-mute-slash')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem('sound-mode') ?? 'null')).toBe(SOUND_MODE.OFF);

    soundToggle.click();
    expect(isSoundEnabled()).toBe(true);
    expect(getSoundMode()).toBe(SOUND_MODE.ON);
    expect(soundIcon.dataset.enabled).toBe('true');
    expect(soundIcon.dataset.soundMode).toBe(SOUND_MODE.ON);
    expect(soundToggle.getAttribute('aria-label')).toBe('Sound on');
  });

  it('loads the reverb state from persisted storage on app init', async () => {
    localStorage.setItem('sound-mode', JSON.stringify(SOUND_MODE.REVERB));

    await initApp();

    const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    const soundIcon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    expect(soundToggle.dataset.soundMode).toBe(SOUND_MODE.REVERB);
    expect(soundIcon.dataset.soundMode).toBe(SOUND_MODE.REVERB);
    expect(soundToggle.getAttribute('aria-label')).toBe('Sound on with reverb');
  });
});
