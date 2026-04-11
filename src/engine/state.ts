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
export { getRenderedMeasuresCount } from '@/app/app-controller';
export {
  recordCorrectNote,
  recordWrongNote,
  resetStats,
  stats,
} from '@/engine/statistics-state';
