import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SOUND_MODE, SOUND_MODE } from '@/audio/sound-mode';
import { getSoundMode, setSoundMode } from '@/audio/note-player';
import { initSoundToggle, resetSoundToggle, updateSoundToggleUI } from '@/ui/sound-toggle';

function renderSoundToggle(): void {
  document.body.innerHTML = `
    <button id="sound-toggle" type="button" class="icon-button">
      <span id="sound-toggle-icon" class="sound-icon">
        <span class="sound-icon-speaker"></span>
        <span class="sound-icon-wave sound-icon-wave-primary"></span>
        <span class="sound-icon-wave sound-icon-wave-secondary"></span>
        <span class="sound-icon-wave sound-icon-wave-tertiary"></span>
        <span class="sound-icon-mute-slash"></span>
      </span>
    </button>
  `;
}

describe('sound toggle ui helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    renderSoundToggle();
    setSoundMode(DEFAULT_SOUND_MODE);
    vi.restoreAllMocks();
  });

  it('renders the default reverb state metadata', () => {
    updateSoundToggleUI();

    const button = document.getElementById('sound-toggle') as HTMLButtonElement;
    const icon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    expect(button.dataset.enabled).toBe('true');
    expect(button.dataset.soundMode).toBe(SOUND_MODE.REVERB);
    expect(button.getAttribute('aria-label')).toBe('Sound on with reverb');
    expect(button.title).toBe('Sound on with reverb');
    expect(icon.dataset.soundMode).toBe(SOUND_MODE.REVERB);
    expect(icon.querySelector('.sound-icon-wave-primary')).not.toBeNull();
    expect(icon.querySelector('.sound-icon-wave-secondary')).not.toBeNull();
    expect(icon.querySelector('.sound-icon-wave-tertiary')).not.toBeNull();
  });

  it('renders the off state metadata', () => {
    setSoundMode(SOUND_MODE.OFF);
    updateSoundToggleUI();

    const button = document.getElementById('sound-toggle') as HTMLButtonElement;

    expect(button.dataset.enabled).toBe('false');
    expect(button.dataset.soundMode).toBe(SOUND_MODE.OFF);
    expect(button.title).toBe('Sound off');
  });

  it('renders the reverb state metadata', () => {
    setSoundMode(SOUND_MODE.REVERB);
    updateSoundToggleUI();

    const button = document.getElementById('sound-toggle') as HTMLButtonElement;
    const icon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    expect(button.dataset.enabled).toBe('true');
    expect(button.dataset.soundMode).toBe(SOUND_MODE.REVERB);
    expect(button.getAttribute('aria-label')).toBe('Sound on with reverb');
    expect(button.title).toBe('Sound on with reverb');
    expect(icon.dataset.soundMode).toBe(SOUND_MODE.REVERB);
  });

  it('keeps button and icon datasets synchronized for each mode', () => {
    const button = document.getElementById('sound-toggle') as HTMLButtonElement;
    const icon = document.getElementById('sound-toggle-icon') as HTMLSpanElement;

    for (const mode of [SOUND_MODE.OFF, SOUND_MODE.ON, SOUND_MODE.REVERB]) {
      setSoundMode(mode);
      updateSoundToggleUI();
      expect(button.dataset.soundMode).toBe(mode);
      expect(icon.dataset.soundMode).toBe(mode);
      expect(button.dataset.enabled).toBe(String(mode !== SOUND_MODE.OFF));
      expect(icon.dataset.enabled).toBe(String(mode !== SOUND_MODE.OFF));
    }
  });

  it('initializes from the persisted sound mode', () => {
    localStorage.setItem('sound-mode', JSON.stringify(SOUND_MODE.REVERB));

    initSoundToggle();

    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
    expect((document.getElementById('sound-toggle') as HTMLButtonElement).dataset.soundMode).toBe(SOUND_MODE.REVERB);
  });

  it('migrates the legacy boolean storage key', () => {
    localStorage.setItem('sound-enabled', JSON.stringify(false));

    initSoundToggle();

    expect(getSoundMode()).toBe(SOUND_MODE.OFF);
    expect((document.getElementById('sound-toggle') as HTMLButtonElement).dataset.soundMode).toBe(SOUND_MODE.OFF);
  });

  it('prefers the explicit sound mode over the legacy boolean key', () => {
    localStorage.setItem('sound-mode', JSON.stringify(SOUND_MODE.REVERB));
    localStorage.setItem('sound-enabled', JSON.stringify(false));

    initSoundToggle();

    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
  });

  it('ignores invalid persisted sound modes', () => {
    localStorage.setItem('sound-mode', JSON.stringify('loud'));

    initSoundToggle();

    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
  });

  it('cycles through all three states and persists each click', () => {
    initSoundToggle();

    const button = document.getElementById('sound-toggle') as HTMLButtonElement;

    button.click(); // Reverb -> Off
    expect(getSoundMode()).toBe(SOUND_MODE.OFF);
    expect(JSON.parse(localStorage.getItem('sound-mode') ?? 'null')).toBe(SOUND_MODE.OFF);

    button.click(); // Off -> On
    expect(getSoundMode()).toBe(SOUND_MODE.ON);
    expect(JSON.parse(localStorage.getItem('sound-mode') ?? 'null')).toBe(SOUND_MODE.ON);

    button.click(); // On -> Reverb
    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
    expect(JSON.parse(localStorage.getItem('sound-mode') ?? 'null')).toBe(SOUND_MODE.REVERB);
  });

  it('resets the toggle back to the default sound mode', () => {
    setSoundMode(SOUND_MODE.OFF);

    resetSoundToggle();

    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
    expect(JSON.parse(localStorage.getItem('sound-mode') ?? 'null')).toBe(SOUND_MODE.REVERB);
  });

  it('does nothing when the toggle button is missing', () => {
    document.body.innerHTML = '';

    expect(() => initSoundToggle()).not.toThrow();
    expect(() => updateSoundToggleUI()).not.toThrow();
  });
});
