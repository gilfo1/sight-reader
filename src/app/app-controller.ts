import { stopAllNotes } from '@/audio/note-player';
import {
  resetSessionState,
  setMusicData,
} from '@/engine/session-state';
import { initMidiHandler } from '@/engine/midi-handler';
import { resetStats } from '@/engine/state';
import type { GeneratorConfig, Measure } from '@/engine/types';
import { clearRenderCache } from '@/rendering/score-renderer';
import {
  generateAndStoreScoreData,
  getRenderedMeasuresCount,
  refreshRenderedUI,
  renderCurrentScore,
} from '@/app/app-controller-runtime';
import {
  applyUIConfig,
  DEFAULT_CONFIG,
  getUIConfig,
  initKeySignatures,
  loadAccordionState,
  resetAccordionState,
  saveUIConfig,
  setupEventListeners,
  updateNoteSelectors,
} from '@/ui/controls';
import { initStatsUI } from '@/ui/stats';
import {
  initPianoKeyboard,
  releaseAllKeyboardNotes,
} from '@/ui/piano-keyboard';
import { isSettingsModalOpen, initSettingsModal, closeSettingsModal } from '@/ui/settings-modal';
import { initSoundToggle, resetSoundToggle } from '@/ui/sound-toggle';
import { clearStorage, loadFromStorage } from '@/utils/storage';

function resetGameState(keepHeldNotes = false): void {
  releaseAllKeyboardNotes();
  resetSessionState(keepHeldNotes);
  clearRenderCache();
}

function regenerateScore(keepHeldNotes = false): void {
  resetGameState(keepHeldNotes);
  generateAndStoreScoreData(setMusicData);
}

function handleStateChange(shouldRegenerate = false, keepHeldNotes = false): void {
  if (isSettingsModalOpen()) {
    return;
  }

  if (shouldRegenerate) {
    regenerateScore(keepHeldNotes);
  }

  refreshRenderedUI(setMusicData);
}

export function resetAllToDefaults(): void {
  clearStorage();
  closeSettingsModal();
  resetSoundToggle();
  resetStats();
  applyUIConfig(DEFAULT_CONFIG);
  saveUIConfig();
  resetAccordionState();
  stopAllNotes(); // Stop all sound on hard reset
  handleStateChange(true, false); // Don't keep notes on hard reset
}

export function generateAndStoreScore(config?: Partial<GeneratorConfig>): Measure[] {
  return generateAndStoreScoreData(setMusicData, config);
}

export async function initApp(): Promise<void> {
  updateNoteSelectors();
  initKeySignatures(() => handleStateChange(true));
  initStatsUI();
  initSettingsModal(() => {
    regenerateScore();
    refreshRenderedUI(setMusicData);
  });
  initSoundToggle();

  const savedConfig = loadFromStorage<Partial<GeneratorConfig>>('generator-config');
  if (savedConfig) {
    applyUIConfig(savedConfig);
  }

  loadAccordionState();
  initPianoKeyboard(() => handleStateChange(true));
  generateAndStoreScore();
  renderCurrentScore(setMusicData);

  initMidiHandler(handleStateChange);
  setupEventListeners(() => handleStateChange(true));

  window.addEventListener('resize', () => {
    renderCurrentScore(setMusicData);
  });

  const resetButton = document.getElementById('reset-all-settings');
  resetButton?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings and stats to defaults?')) {
      resetAllToDefaults();
    }
  });
}

function renderScore(outputDiv: HTMLElement | null = null, config?: Partial<GeneratorConfig>): void {
  renderCurrentScore(setMusicData, outputDiv, config);
}

export { getUIConfig, initKeySignatures, renderScore, resetGameState, clearRenderCache, getRenderedMeasuresCount };
