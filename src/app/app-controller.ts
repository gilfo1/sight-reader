import {
  activeMidiNotes,
  currentStepIndex,
  getStepInfo,
  musicData,
  resetSessionState,
  setMusicData,
} from '@/engine/session-state';
import { initMidiHandler } from '@/engine/midi-handler';
import { generateScoreData } from '@/engine/music-generator';
import { resetStats } from '@/engine/state';
import type { GeneratorConfig, Measure } from '@/engine/types';
import { clearRenderCache, renderScore as drawScore } from '@/rendering/score-renderer';
import {
  DEFAULT_CONFIG,
  applyUIConfig,
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
import { initPianoKeyboard, releaseAllKeyboardNotes } from '@/ui/piano-keyboard';
import { clearStorage, loadFromStorage } from '@/utils/storage';
import { suppressedNotes } from '@/engine/session-state';

function getGeneratorConfig(config?: Partial<GeneratorConfig>): GeneratorConfig {
  return { ...getEffectiveUIConfig(), ...config };
}

function resetGameState(): void {
  releaseAllKeyboardNotes();
  resetSessionState();
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

function renderCurrentScore(outputDiv: HTMLElement | null = null, config?: Partial<GeneratorConfig>): void {
  const actualConfig = getGeneratorConfig(config);

  if (musicData.length === 0) {
    setMusicData(generateScoreData(actualConfig));
  }

  drawScore(outputDiv, actualConfig, getRenderContext(), { getStepInfo });
}

function regenerateScore(): void {
  resetGameState();
  setMusicData(generateScoreData(getEffectiveUIConfig()));
}

function handleStateChange(shouldRegenerate = false): void {
  if (shouldRegenerate) {
    regenerateScore();
  }

  renderCurrentScore();
  updateStatsUI();
}

export function resetAllToDefaults(): void {
  clearStorage();
  resetStats();
  applyUIConfig(DEFAULT_CONFIG);
  saveUIConfig();
  resetAccordionState();
  handleStateChange(true);
}

export function generateAndStoreScore(config?: Partial<GeneratorConfig>): Measure[] {
  const actualConfig = getGeneratorConfig(config);
  const generatedScore = generateScoreData(actualConfig);
  setMusicData(generatedScore);
  return generatedScore;
}

export async function initApp(): Promise<void> {
  updateNoteSelectors();
  initKeySignatures(() => handleStateChange(true));
  initStatsUI();

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

  const resetButton = document.getElementById('reset-all-settings');
  resetButton?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings and stats to defaults?')) {
      resetAllToDefaults();
    }
  });
}

export { getUIConfig, initKeySignatures, renderCurrentScore as renderScore, resetGameState };
