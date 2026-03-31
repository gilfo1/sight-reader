import { 
  musicData,
  currentBeatIndex,
  activeMidiNotes,
  suppressedNotes,
  setMusicData, 
  resetGameState as engineResetGameState,
  setCurrentBeatIndex,
  getStepInfo,
  getTotalSteps,
  Measure
} from './engine/state';
import { generateMusicData as engineGenerateMusicData, AppConfig } from './engine/generator';
import { renderStaff as engineRenderStaff, clearRenderCache, RenderState, RenderSelectors } from './rendering/renderer';
import { initMIDI as engineInitMIDI, MIDIInitFunction } from './engine/midi';
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

const initMIDI: MIDIInitFunction = function(onStateChange?: (reg?: boolean) => void): void {
  engineInitMIDI(onStateChange || handleStateChange);
  initMIDI.checkMatch = engineInitMIDI.checkMatch;
  initMIDI.updateStatus = engineInitMIDI.updateStatus;
  initMIDI.onNoteOn = engineInitMIDI.onNoteOn;
  initMIDI.onNoteOff = engineInitMIDI.onNoteOff;
};

function checkMatch(): void {
  engineInitMIDI.checkMatch?.();
}

function getAppState(): RenderState {
  return { musicData, currentBeatIndex, activeMidiNotes, suppressedNotes };
}

function getAppSelectors(): RenderSelectors {
  return { getStepInfo };
}

function handleStateChange(shouldRegenerate: boolean = false): void {
  const config: AppConfig = getUIConfig();
  if (shouldRegenerate) {
    resetGameState();
    setMusicData(engineGenerateMusicData(config));
  }
  engineRenderStaff(null, config, getAppState(), getAppSelectors());
}

const handleRegenerate = (): void => handleStateChange(true);

function generateMusicData(config?: AppConfig): Measure[] {
  const data = engineGenerateMusicData(config || getUIConfig());
  setMusicData(data);
  return data;
}

function renderStaff(outputDiv: HTMLElement | null = null, config?: AppConfig): void {
  const actualConfig = config || getUIConfig();
  if (musicData.length === 0) {
    setMusicData(engineGenerateMusicData(actualConfig));
  }
  return engineRenderStaff(outputDiv, actualConfig, getAppState(), getAppSelectors());
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    updateNoteSelectors();
    initKeySignatures(handleRegenerate);
    
    const config = getUIConfig();
    setMusicData(engineGenerateMusicData(config));
    engineRenderStaff(null, config, getAppState(), getAppSelectors());
    
    initMIDI(handleStateChange);
    setupEventListeners(handleRegenerate);
  });
}

export { 
  musicData, 
  currentBeatIndex, 
  activeMidiNotes, 
  suppressedNotes,
  setMusicData, 
  resetGameState, 
  setCurrentBeatIndex,
  renderStaff, 
  initMIDI, 
  checkMatch,
  initKeySignatures, 
  updateNoteSelectors, 
  getUIConfig,
  generateMusicData,
  getStepInfo,
  getTotalSteps
};
