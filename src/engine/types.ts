export interface Measure {
  trebleSteps: string[][];
  bassSteps: string[][];
  pattern: string[];
  keySignature: string;
  staffType: string;
}

export interface GeneratorConfig {
  measuresPerLine: number;
  linesCount: number;
  staffType: string;
  notesPerStep: number;
  minNote: string;
  maxNote: string;
  maxReach: number;
  selectedNoteValues: string[];
  selectedKeySignatures: string[];
  isChromatic: boolean;
  isAdaptive: boolean;
}

export interface StepLocation {
  measureIdx: number;
  stepIdx: number;
}
