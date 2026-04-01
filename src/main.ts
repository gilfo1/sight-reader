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
  setupEventListeners 
} from './ui/controls';
import { initStatsUI, updateStatsUI } from './ui/stats';

function resetGameState(): void {
  engineResetGameState();
  clearRenderCache();
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

function generateScoreData(config?: GeneratorConfig): Measure[] {
  const data: Measure[] = engineGenerateScoreData(config || getUIConfig());
  setMusicData(data);
  return data;
}

function renderScore(outputDiv: HTMLElement | null = null, config?: GeneratorConfig): void {
  const actualConfig: GeneratorConfig = config || getUIConfig();
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
  
  const config = getUIConfig();
  setMusicData(engineGenerateScoreData(config));
  engineRenderScore(null, config, { musicData, currentStepIndex, activeMidiNotes, suppressedNotes }, { getStepInfo });
  
  engineInitMidiHandler(handleStateChange);
  setupEventListeners(handleRegenerate);
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
