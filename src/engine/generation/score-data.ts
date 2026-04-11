import type { GeneratorConfig, Measure } from '@/engine/types';
import { buildMeasure, getAvailableKeys, selectLineKey } from '@/engine/generation/score-data-helpers';

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
