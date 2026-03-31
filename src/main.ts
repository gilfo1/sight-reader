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
import { generateMusicData, AppConfig } from './engine/generator';
import { renderStaff, clearRenderCache } from './rendering/renderer';
import { initMIDI as engineInitMIDI, MIDIInitFunction } from './engine/midi';

function resetGameState(): void {
  engineResetGameState();
  clearRenderCache();
}

const initMIDI: MIDIInitFunction = function(onStateChange?: (reg?: boolean) => void): void {
  engineInitMIDI(onStateChange || handleStateChange);
  // Re-attach internal logic to the wrapper for legacy test access
  initMIDI.checkMatch = engineInitMIDI.checkMatch;
  initMIDI.updateStatus = engineInitMIDI.updateStatus;
  initMIDI.onNoteOn = engineInitMIDI.onNoteOn;
  initMIDI.onNoteOff = engineInitMIDI.onNoteOff;
};

function checkMatch(): void {
  if (typeof engineInitMIDI.checkMatch === 'function') engineInitMIDI.checkMatch();
}

import { 
  initKeySignatures, 
  updateNoteSelectors, 
  getUIConfig, 
  setupEventListeners 
} from './ui/controls';
import { RenderState, RenderSelectors } from './rendering/renderer';

function getAppState(): RenderState {
  return { musicData, currentBeatIndex, activeMidiNotes, suppressedNotes };
}

function getAppSelectors(): RenderSelectors {
  return { getStepInfo };
}

function handleStateChange(shouldRegenerate: boolean = false): void {
  const config: AppConfig = getUIConfig();
  if (shouldRegenerate) {
    const data: Measure[] = generateMusicData(config);
    resetGameState();
    setMusicData(data);
  }
  renderStaff(null, config, getAppState(), getAppSelectors());
}

const handleRegenerate = (): void => handleStateChange(true);

// Initialize application
function legacyGenerateMusicData(config?: AppConfig): Measure[] {
  const actualConfig: AppConfig = config || getUIConfig();
  const data: Measure[] = generateMusicData(actualConfig);
  setMusicData(data);
  return data;
}

function legacyRenderStaff(outputDiv: HTMLElement | null = null, config?: AppConfig): void {
  // Legacy compatibility: if musicData is empty, generate it based on config
  if (musicData.length === 0) {
    const data: Measure[] = generateMusicData(config || getUIConfig());
    setMusicData(data);
  }
  return renderStaff(outputDiv, config, getAppState(), getAppSelectors());
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
  updateNoteSelectors();
  initKeySignatures(handleRegenerate);
  
  // Initial music generation
  const config = getUIConfig();
  const data = generateMusicData(config);
  setMusicData(data);
  
  renderStaff(null, config, getAppState(), getAppSelectors());
  
    initMIDI(handleStateChange);
    setupEventListeners(handleRegenerate);
  });
}

// Re-export state as live bindings
export { 
  musicData, 
  currentBeatIndex, 
  activeMidiNotes, 
  suppressedNotes 
} from './engine/state';

export { 
  setMusicData, 
  resetGameState, 
  setCurrentBeatIndex,
  legacyRenderStaff as renderStaff, 
  initMIDI, 
  checkMatch,
  initKeySignatures, 
  updateNoteSelectors, 
  legacyGenerateMusicData as generateMusicData,
  getStepInfo,
  getTotalSteps
};
