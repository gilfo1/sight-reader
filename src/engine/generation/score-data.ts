import { KEY_SIGNATURES } from '@/constants/music';
import { computeMeasureCounts } from '@/engine/generation/measure-distribution';
import { getRandomPitches } from '@/engine/generation/pitch-selection';
import { generateRhythmicPattern } from '@/engine/generation/rhythm';
import { stats } from '@/engine/statistics-state';
import type { GeneratorConfig, Measure } from '@/engine/types';
import { weightedRandom } from '@/utils/random';

interface PitchSelectionContext {
  keySignature: string;
  trebleContext: string[];
  bassContext: string[];
}

function getAvailableKeys(selectedKeySignatures: string[]): string[] {
  const validKeys = selectedKeySignatures.filter((keySignature) => KEY_SIGNATURES.includes(keySignature));
  return validKeys.length > 0 ? validKeys : ['C'];
}

function selectLineKey(
  availableKeys: string[],
  isAdaptive: boolean,
  lastLineKey: string,
  lineKeyRepeatCount: number,
): string {
  if (!isAdaptive || availableKeys.length <= 1) {
    return availableKeys[Math.floor(Math.random() * availableKeys.length)]!;
  }

  const candidateKeys = lineKeyRepeatCount >= 4
    ? availableKeys.filter((keySignature) => keySignature !== lastLineKey)
    : availableKeys;

  const weightedKeys = candidateKeys.length > 0 ? candidateKeys : availableKeys;
  const weights = weightedKeys.map((keySignature) => {
    let weight = 1 + (stats.troubleKeys[keySignature] ?? 0) * 5;

    if (keySignature === lastLineKey) {
      weight /= Math.pow(2, lineKeyRepeatCount);
    }

    return weight;
  });

  return weightedRandom(weightedKeys, weights);
}

function getPitchesForStaff(
  clef: 'treble' | 'bass',
  noteCount: number,
  config: GeneratorConfig,
  keySignature: string,
  existingPitches: string[],
): string[] {
  if (noteCount <= 0) {
    return [];
  }

  return getRandomPitches(
    clef,
    noteCount,
    config.minNote,
    config.maxNote,
    keySignature,
    config.isChromatic,
    config.isAdaptive,
    config.maxReach,
    existingPitches,
  );
}

function addStep(
  staffSteps: string[][],
  contextNotes: string[],
  notes: string[],
): void {
  staffSteps.push(notes);
  contextNotes.push(...notes);
}

function addGrandStaffStep(
  trebleSteps: string[][],
  bassSteps: string[][],
  pitchContext: PitchSelectionContext,
  trebleCount: number,
  bassCount: number,
  config: GeneratorConfig,
): void {
  const trebleNotes = getPitchesForStaff('treble', 1, config, pitchContext.keySignature, pitchContext.trebleContext);
  const bassNotes = getPitchesForStaff('bass', 1, config, pitchContext.keySignature, pitchContext.bassContext);

  if (trebleCount > 0 && trebleNotes.length === 0 && bassNotes.length > 0) {
    addStep(trebleSteps, pitchContext.trebleContext, []);
    addStep(bassSteps, pitchContext.bassContext, bassNotes);
    return;
  }

  if (bassCount > 0 && bassNotes.length === 0 && trebleNotes.length > 0) {
    addStep(trebleSteps, pitchContext.trebleContext, trebleNotes);
    addStep(bassSteps, pitchContext.bassContext, []);
    return;
  }

  addStep(trebleSteps, pitchContext.trebleContext, trebleCount > 0 ? trebleNotes : []);
  addStep(bassSteps, pitchContext.bassContext, bassCount > 0 ? bassNotes : []);
}

function buildMeasure(
  config: GeneratorConfig,
  keySignature: string,
  measureIdx: number,
  previousTrebleNotes: string[],
  previousBassNotes: string[],
): Measure {
  const pattern = generateRhythmicPattern(config.selectedNoteValues);
  const { trebleCounts, bassCounts } = computeMeasureCounts(
    config.staffType,
    config.notesPerStep,
    measureIdx,
    pattern,
  );

  const trebleSteps: string[][] = [];
  const bassSteps: string[][] = [];
  const pitchContext: PitchSelectionContext = {
    keySignature,
    trebleContext: [...previousTrebleNotes],
    bassContext: [...previousBassNotes],
  };

  for (let stepIdx = 0; stepIdx < pattern.length; stepIdx++) {
    const trebleCount = trebleCounts[stepIdx] ?? 0;
    const bassCount = bassCounts[stepIdx] ?? 0;

    if (config.staffType === 'grand' && config.notesPerStep === 1) {
      addGrandStaffStep(trebleSteps, bassSteps, pitchContext, trebleCount, bassCount, config);
      continue;
    }

    addStep(
      trebleSteps,
      pitchContext.trebleContext,
      getPitchesForStaff('treble', trebleCount, config, keySignature, pitchContext.trebleContext),
    );
    addStep(
      bassSteps,
      pitchContext.bassContext,
      getPitchesForStaff('bass', bassCount, config, keySignature, pitchContext.bassContext),
    );
  }

  return {
    trebleSteps,
    bassSteps,
    pattern,
    staffType: config.staffType,
    keySignature,
  };
}

export function generateScoreData(config: GeneratorConfig): Measure[] {
  const music: Measure[] = [];
  const availableKeys = getAvailableKeys(config.selectedKeySignatures);

  let lastLineKey = '';
  let repeatedLineKeyCount = 0;
  let previousTrebleNotes: string[] = [];
  let previousBassNotes: string[] = [];

  for (let lineIdx = 0; lineIdx < config.linesCount; lineIdx++) {
    const lineKey = selectLineKey(availableKeys, config.isAdaptive, lastLineKey, repeatedLineKeyCount);

    if (lineKey === lastLineKey) {
      repeatedLineKeyCount++;
    } else {
      lastLineKey = lineKey;
      repeatedLineKeyCount = 1;
    }

    for (let measureOffset = 0; measureOffset < config.measuresPerLine; measureOffset++) {
      const measureIdx = lineIdx * config.measuresPerLine + measureOffset;
      const measure = buildMeasure(config, lineKey, measureIdx, previousTrebleNotes, previousBassNotes);
      music.push(measure);

      previousTrebleNotes = [...(measure.trebleSteps.findLast((step) => step.length > 0) ?? [])];
      previousBassNotes = [...(measure.bassSteps.findLast((step) => step.length > 0) ?? [])];
    }
  }

  return music;
}
