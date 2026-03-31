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

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    updateNoteSelectors();
    initKeySignatures(handleRegenerate);
    
    const config = getUIConfig();
    setMusicData(generateScoreData(config));
    engineRenderScore(null, config, { musicData, currentStepIndex: currentStepIndex, activeMidiNotes, suppressedNotes }, { getStepInfo });
    
    engineInitMidiHandler(handleStateChange);
    setupEventListeners(handleRegenerate);
  });
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
