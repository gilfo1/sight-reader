import { 
  musicData,
  currentStepIndex,
  activeMidiNotes,
  suppressedNotes,
  setMusicData, 
  resetGameState as engineResetGameState,
  setCurrentStepIndex,
  getStepInfo,
  getTotalSteps,
  Measure
} from './engine/state';
import { generateScoreData as engineGenerateScoreData, GeneratorConfig } from './engine/music-generator';
import { renderScore as engineRenderScore, clearRenderCache } from './rendering/score-renderer';
import { initMidiHandler as engineInitMidiHandler } from './engine/midi-handler';
import { 
  initKeySignatures, 
  updateNoteSelectors, 
  getUIConfig, 
  setupEventListeners,
  applyUIConfig,
  loadAccordionState,
  saveUIConfig,
  resetAccordionState,
  DEFAULT_CONFIG
} from './ui/controls';
import { initStatsUI, updateStatsUI } from './ui/stats';
import { loadFromStorage, clearStorage } from './utils/storage';
import { resetStats } from './engine/state';

function resetGameState(): void {
  engineResetGameState();
  clearRenderCache();
}

export function resetAllToDefaults(): void {
  clearStorage();
  resetStats();
  applyUIConfig(DEFAULT_CONFIG);
  saveUIConfig();
  resetAccordionState();
  handleStateChange(true);
}

function handleStateChange(shouldRegenerate: boolean = false): void {
  const config: GeneratorConfig = getUIConfig();
  if (shouldRegenerate) {
    resetGameState();
    setMusicData(engineGenerateScoreData(config));
  }
  engineRenderScore(null, config, { musicData, currentStepIndex, activeMidiNotes, suppressedNotes }, { getStepInfo });
  updateStatsUI();
}

const handleRegenerate = (): void => handleStateChange(true);

function generateScoreData(config?: Partial<GeneratorConfig>): Measure[] {
  const actualConfig: GeneratorConfig = { ...getUIConfig(), ...config };
  const data: Measure[] = engineGenerateScoreData(actualConfig);
  setMusicData(data);
  return data;
}

function renderScore(outputDiv: HTMLElement | null = null, config?: Partial<GeneratorConfig>): void {
  const actualConfig: GeneratorConfig = { ...getUIConfig(), ...config };
  if (musicData.length === 0) {
    setMusicData(engineGenerateScoreData(actualConfig));
  }
  engineRenderScore(outputDiv, actualConfig, { musicData, currentStepIndex, activeMidiNotes, suppressedNotes }, { getStepInfo });
}

function checkMatch(): void {
  engineInitMidiHandler.checkMatch?.();
}

export async function initApp(): Promise<void> {
  updateNoteSelectors();
  initKeySignatures(handleRegenerate);
  initStatsUI();
  
  const savedConfig = loadFromStorage<Partial<GeneratorConfig>>('generator-config');
  if (savedConfig) {
    applyUIConfig(savedConfig);
  }
  loadAccordionState();

  const config = getUIConfig();
  setMusicData(engineGenerateScoreData(config));
  engineRenderScore(null, config, { musicData, currentStepIndex, activeMidiNotes, suppressedNotes }, { getStepInfo });
  
  engineInitMidiHandler(handleStateChange);
  setupEventListeners(handleRegenerate);

  const resetAllBtn = document.getElementById('reset-all-settings');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all settings and stats to defaults?')) {
        resetAllToDefaults();
      }
    });
  }
}

if (typeof document !== 'undefined') {
  document.title = 'sight-reader';

  if (document.readyState === 'complete') {
    initApp();
  } else {
    window.addEventListener('load', initApp);
  }
}

export { 
  musicData,
  currentStepIndex,
  activeMidiNotes, 
  suppressedNotes,
  setMusicData, 
  resetGameState, 
  setCurrentStepIndex,
  renderScore, 
  engineInitMidiHandler as initMidiHandler, 
  checkMatch,
  initKeySignatures, 
  updateNoteSelectors, 
  getUIConfig,
  generateScoreData,
  getStepInfo,
  getTotalSteps
};
