export type { Measure } from '@/engine/types';
export type { AppStats } from '@/engine/statistics-state';
export {
  activeMidiNotes,
  currentStepIndex,
  getStepInfo,
  getTargetNotesAtStep,
  getTotalSteps,
  musicData,
  resetSessionState as resetGameState,
  setCurrentStepIndex,
  setMusicData,
  suppressedNotes,
} from '@/engine/session-state';
export {
  recordCorrectNote,
  recordWrongNote,
  resetStats,
  stats,
} from '@/engine/statistics-state';
