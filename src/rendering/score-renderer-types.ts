import type { Measure, StepLocation } from '@/engine';

export interface RenderState {
  musicData: Measure[];
  currentStepIndex: number;
  activeMidiNotes: Set<string>;
  suppressedNotes: Set<string>;
}

export interface RenderSelectors {
  getStepInfo: (index: number) => StepLocation | null;
  getRenderedMeasuresCount: () => number;
}

export const DEFAULT_RENDER_STATE: RenderState = {
  musicData: [],
  currentStepIndex: 0,
  activeMidiNotes: new Set(),
  suppressedNotes: new Set(),
};

export const DEFAULT_MEASURE: Measure = {
  keySignature: 'C',
  pattern: [],
  trebleSteps: [],
  bassSteps: [],
  staffType: 'grand',
};
