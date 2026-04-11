import { stopAllNotes } from '@/audio/note-player';
import {
  activeMidiNotes,
  currentStepIndex,
  getStepInfo,
  musicData,
  resetSessionState,
  setMusicData,
  suppressedNotes,
} from '@/engine/session-state';
import { initMidiHandler } from '@/engine/midi-handler';
import { generateScoreData } from '@/engine/music-generator';
import { resetStats } from '@/engine/state';
import type { GeneratorConfig, Measure } from '@/engine/types';
import { clearRenderCache, renderScore as drawScore } from '@/rendering/score-renderer';
import {
  applyUIConfig,
  DEFAULT_CONFIG,
  getEffectiveUIConfig,
  getUIConfig,
  initKeySignatures,
  loadAccordionState,
  resetAccordionState,
  saveUIConfig,
  setupEventListeners,
  updateNoteSelectors,
} from '@/ui/controls';
import { initStatsUI, updateStatsUI } from '@/ui/stats';
import {
  getKeyboardRange,
  initPianoKeyboard,
  isPianoKeyboardOpen,
  releaseAllKeyboardNotes,
  updatePianoKeyboardActiveNotes,
} from '@/ui/piano-keyboard';
import { closeSettingsModal, initSettingsModal } from '@/ui/settings-modal';
import { initSoundToggle, resetSoundToggle } from '@/ui/sound-toggle';
import { clearStorage, loadFromStorage } from '@/utils/storage';

function getGeneratorConfig(config?: Partial<GeneratorConfig>): GeneratorConfig {
  const baseConfig = { ...getEffectiveUIConfig(), ...config };

  if (isPianoKeyboardOpen()) {
    const keyboardRange = getKeyboardRange();
    return {
      ...baseConfig,
      minNote: keyboardRange.minNote,
      maxNote: keyboardRange.maxNote,
    };
  }

  return baseConfig;
}

function resetGameState(keepHeldNotes = false): void {
  releaseAllKeyboardNotes();
  resetSessionState(keepHeldNotes);
  clearRenderCache();
}

function getRenderContext() {
  return {
    musicData,
    currentStepIndex,
    activeMidiNotes,
    suppressedNotes,
  };
}

let lastRenderedMeasuresCount = 0;

function renderCurrentScore(outputDiv: HTMLElement | null = null, config?: Partial<GeneratorConfig>): void {
  const actualConfig = getGeneratorConfig(config);

  if (musicData.length === 0) {
    setMusicData(generateScoreData(actualConfig));
  }

  lastRenderedMeasuresCount = drawScore(outputDiv, actualConfig, getRenderContext(), { 
    getStepInfo,
    getRenderedMeasuresCount: () => lastRenderedMeasuresCount
  }) || 0;
}

function regenerateScore(keepHeldNotes = false): void {
  resetGameState(keepHeldNotes);
  setMusicData(generateScoreData(getEffectiveUIConfig()));
}

function handleStateChange(shouldRegenerate = false, keepHeldNotes = false): void {
  if (shouldRegenerate) {
    regenerateScore(keepHeldNotes);
  }

  updatePianoKeyboardActiveNotes();
  renderCurrentScore();
  updateStatsUI();
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
  const actualConfig = getGeneratorConfig(config);
  const generatedScore = generateScoreData(actualConfig);
  setMusicData(generatedScore);
  return generatedScore;
}

export function getRenderedMeasuresCount(): number {
  return lastRenderedMeasuresCount;
}

export async function initApp(): Promise<void> {
  updateNoteSelectors();
  initKeySignatures(() => handleStateChange(true));
  initStatsUI();
  initSettingsModal();
  initSoundToggle();

  const savedConfig = loadFromStorage<Partial<GeneratorConfig>>('generator-config');
  if (savedConfig) {
    applyUIConfig(savedConfig);
  }

  loadAccordionState();
  initPianoKeyboard(() => handleStateChange(true));
  generateAndStoreScore();
  renderCurrentScore();

  initMidiHandler(handleStateChange);
  setupEventListeners(() => handleStateChange(true));

  window.addEventListener('resize', () => {
    renderCurrentScore();
  });

  const resetButton = document.getElementById('reset-all-settings');
  resetButton?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings and stats to defaults?')) {
      resetAllToDefaults();
    }
  });
}

export { getUIConfig, initKeySignatures, renderCurrentScore as renderScore, resetGameState };
