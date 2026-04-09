import { isSoundEnabled, setSoundEnabled, toggleSoundEnabled } from '@/audio/note-player';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

const SOUND_ENABLED_STORAGE_KEY = 'sound-enabled';

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

  const enabled = isSoundEnabled();
  button.dataset.enabled = String(enabled);
  button.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
  button.title = enabled ? 'Turn sound off' : 'Turn sound on';
  icon.dataset.enabled = String(enabled);
}

export function resetSoundToggle(): void {
  setSoundEnabled(true);
  saveToStorage(SOUND_ENABLED_STORAGE_KEY, true);
  updateSoundToggleUI();
}

export function initSoundToggle(): void {
  const button = getSoundToggleButton();

  if (!button) {
    return;
  }

  const storedEnabled = loadFromStorage<boolean>(SOUND_ENABLED_STORAGE_KEY);
  setSoundEnabled(storedEnabled ?? true);
  updateSoundToggleUI();

  button.onclick = () => {
    const enabled = toggleSoundEnabled();
    saveToStorage(SOUND_ENABLED_STORAGE_KEY, enabled);
    updateSoundToggleUI();
  };
}
