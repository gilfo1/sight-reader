import { DEFAULT_SOUND_MODE, isValidSoundMode, SOUND_MODE, type SoundMode } from '@/audio/sound-mode';
import { getSoundMode, setSoundMode, toggleSoundMode } from '@/audio/note-player';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

const SOUND_MODE_STORAGE_KEY = 'sound-mode';
const LEGACY_SOUND_ENABLED_STORAGE_KEY = 'sound-enabled';

function getSoundToggleButton(): HTMLButtonElement | null {
  return document.getElementById('sound-toggle') as HTMLButtonElement | null;
}

function getSoundToggleIcon(): HTMLSpanElement | null {
  return document.getElementById('sound-toggle-icon') as HTMLSpanElement | null;
}

export function updateSoundToggleUI(): void {
  const button = getSoundToggleButton();
  const icon = getSoundToggleIcon();

  if (!button || !icon) {
    return;
  }

  const soundMode = getSoundMode();
  const labels: Record<SoundMode, string> = {
    [SOUND_MODE.OFF]: 'Sound off',
    [SOUND_MODE.ON]: 'Sound on',
    [SOUND_MODE.REVERB]: 'Sound on with reverb',
  };

  button.dataset.enabled = String(soundMode !== SOUND_MODE.OFF);
  button.dataset.soundMode = soundMode;
  button.setAttribute('aria-label', labels[soundMode]);
  button.title = labels[soundMode];
  icon.dataset.enabled = String(soundMode !== SOUND_MODE.OFF);
  icon.dataset.soundMode = soundMode;
}

export function resetSoundToggle(): void {
  setSoundMode(DEFAULT_SOUND_MODE);
  saveToStorage(SOUND_MODE_STORAGE_KEY, DEFAULT_SOUND_MODE);
  updateSoundToggleUI();
}

function loadStoredSoundMode(): SoundMode {
  const storedMode = loadFromStorage<unknown>(SOUND_MODE_STORAGE_KEY);

  if (isValidSoundMode(storedMode)) {
    return storedMode;
  }

  const storedEnabled = loadFromStorage<boolean>(LEGACY_SOUND_ENABLED_STORAGE_KEY);
  if (typeof storedEnabled === 'boolean') {
    return storedEnabled ? SOUND_MODE.ON : SOUND_MODE.OFF;
  }

  return DEFAULT_SOUND_MODE;
}

export function initSoundToggle(): void {
  const button = getSoundToggleButton();

  if (!button) {
    return;
  }

  setSoundMode(loadStoredSoundMode());
  updateSoundToggleUI();

  button.onclick = () => {
    const soundMode = toggleSoundMode();
    saveToStorage(SOUND_MODE_STORAGE_KEY, soundMode);
    updateSoundToggleUI();
  };
}
