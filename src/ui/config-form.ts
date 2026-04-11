import { KEY_SIGNATURES } from '@/constants/music';
import { saveToStorage } from '@/utils/storage';
import { markSettingsChanged } from '@/ui/settings-modal';
import {
  applyUIConfig,
  DEFAULT_CONFIG,
  GENERATOR_CONFIG_STORAGE_KEY,
  getEffectiveUIConfig,
  getUIConfig,
  ui,
  updateNoteSelectors,
} from '@/ui/config-form-state';
import { setupConfigFormEventListeners } from '@/ui/config-form-events';

export { applyUIConfig, DEFAULT_CONFIG, getEffectiveUIConfig, getUIConfig, updateNoteSelectors };

export function initKeySignatures(onChange: (event: Event) => void): void {
  const keySignatureContainer = ui.keySignatures;

  if (!keySignatureContainer) {
    return;
  }

  keySignatureContainer.innerHTML = '';

  [...KEY_SIGNATURES, 'Chromatic'].forEach((keySignature) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');

    label.className = keySignature === 'Chromatic' ? 'option-toggle' : 'option-chip';
    checkbox.type = 'checkbox';
    checkbox.value = keySignature;
    checkbox.id = `key-${keySignature}`;
    checkbox.checked = keySignature === 'C';
    checkbox.addEventListener('change', onChange);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${keySignature}`));
    keySignatureContainer.appendChild(label);
  });
}

export function saveUIConfig(): void {
  saveToStorage(GENERATOR_CONFIG_STORAGE_KEY, getUIConfig());
}

export function setupEventListeners(onConfigChange: () => void): void {
  setupConfigFormEventListeners({
    markSettingsChanged,
    onConfigChange,
    saveUIConfig,
  });
}
