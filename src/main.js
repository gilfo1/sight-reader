import { 
  musicData,
  currentBeatIndex,
  activeMidiNotes,
  suppressedNotes,
  setMusicData, 
  resetGameState as engineResetGameState,
  setCurrentBeatIndex,
  getStepInfo,
  getTotalSteps
} from './engine/state.js';
import { generateMusicData } from './engine/generator.js';
import { renderStaff, clearRenderCache } from './rendering/renderer.js';

function resetGameState() {
  engineResetGameState();
  clearRenderCache();
}
import { initMIDI as engineInitMIDI } from './engine/midi.js';

function initMIDI(onStateChange) {
  engineInitMIDI(onStateChange || handleStateChange);
  // Re-attach internal logic to the wrapper for legacy test access
  initMIDI.checkMatch = engineInitMIDI.checkMatch;
  initMIDI.updateStatus = engineInitMIDI.updateStatus;
  initMIDI.onNoteOn = engineInitMIDI.onNoteOn;
  initMIDI.onNoteOff = engineInitMIDI.onNoteOff;
}

function checkMatch() {
  if (typeof engineInitMIDI.checkMatch === 'function') engineInitMIDI.checkMatch();
}

import { 
  initKeySignatures, 
  updateNoteSelectors, 
  getUIConfig, 
  setupEventListeners 
} from './ui/controls.js';

function getAppState() {
  return { musicData, currentBeatIndex, activeMidiNotes, suppressedNotes };
}

function getAppSelectors() {
  return { getStepInfo };
}

function handleStateChange(shouldRegenerate = false) {
  const config = getUIConfig();
  if (shouldRegenerate) {
    const data = generateMusicData(config);
    resetGameState();
    setMusicData(data);
  }
  renderStaff(null, config, getAppState(), getAppSelectors());
}

const handleRegenerate = () => handleStateChange(true);

// Initialize application
function legacyGenerateMusicData() {
  const config = getUIConfig();
  const data = generateMusicData(config);
  setMusicData(data);
  return data;
}

function legacyRenderStaff(outputDiv, config) {
  // Legacy compatibility: if musicData is empty, generate it based on config
  if (musicData.length === 0) {
    const data = generateMusicData(config || getUIConfig());
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
} from './engine/state.js';

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
