import './styles/app.css';
import {
  generateAndStoreScore as generateScoreData,
  getUIConfig,
  initApp,
  initKeySignatures,
  renderScore,
  resetAllToDefaults,
  resetGameState,
  clearRenderCache,
  getRenderedMeasuresCount,
} from './app/app-controller';
import { initMidiHandler } from './engine/midi-handler';
import {
  activeMidiNotes,
  currentStepIndex,
  getStepInfo,
  getTotalSteps,
  musicData,
  setCurrentStepIndex,
  setMusicData,
  suppressedNotes,
} from './engine/state';
import { updateNoteSelectors } from './ui/controls';
import { initPianoKeyboard } from './ui/piano-keyboard';
import { initSettingsModal } from './ui/settings-modal';
import { initSoundToggle } from './ui/sound-toggle';

function checkMatch(): void {
  initMidiHandler.checkMatch?.();
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
  initApp,
  musicData,
  currentStepIndex,
  activeMidiNotes, 
  suppressedNotes,
  setMusicData, 
  resetGameState, 
  setCurrentStepIndex,
  renderScore, 
  initMidiHandler, 
  checkMatch,
  initKeySignatures, 
  initPianoKeyboard,
  initSettingsModal,
  initSoundToggle,
  updateNoteSelectors,
  getUIConfig,
  generateScoreData,
  getStepInfo,
  getTotalSteps,
  resetAllToDefaults,
  clearRenderCache,
  getRenderedMeasuresCount,
};
