import {
  activeMidiNotes,
  currentStepIndex,
  getStepInfo,
  musicData,
  suppressedNotes,
} from '@/engine/session-state';
import { generateScoreData } from '@/engine/music-generator';
import type { GeneratorConfig, Measure } from '@/engine/types';
import { renderScore as drawScore } from '@/rendering/score-renderer';
import { getEffectiveUIConfig } from '@/ui/controls';
import { updateStatsUI } from '@/ui/stats';
import { updatePianoKeyboardActiveNotes } from '@/ui/piano-keyboard';

let lastRenderedMeasuresCount = 0;

function getGeneratorConfig(config?: Partial<GeneratorConfig>): GeneratorConfig {
  return { ...getEffectiveUIConfig(), ...config };
}

function getRenderContext(): any {
  return {
    musicData,
    currentStepIndex,
    activeMidiNotes,
    suppressedNotes,
  };
}

export function generateAndStoreScoreData(setMusicData: (measures: Measure[]) => void, config?: Partial<GeneratorConfig>): Measure[] {
  const generatedScore = generateScoreData(getGeneratorConfig(config));
  setMusicData(generatedScore);
  return generatedScore;
}

export function renderCurrentScore(
  setMusicData: (measures: Measure[]) => void,
  outputDiv: HTMLElement | null = null,
  config?: Partial<GeneratorConfig>,
): void {
  const actualConfig = getGeneratorConfig(config);

  if (musicData.length === 0) {
    setMusicData(generateScoreData(actualConfig));
  }

  lastRenderedMeasuresCount = drawScore(outputDiv, actualConfig, getRenderContext(), {
    getStepInfo,
    getRenderedMeasuresCount: () => lastRenderedMeasuresCount,
  }) || 0;
}

export function refreshRenderedUI(
  setMusicData: (measures: Measure[]) => void,
  outputDiv: HTMLElement | null = null,
  config?: Partial<GeneratorConfig>,
): void {
  updatePianoKeyboardActiveNotes();
  renderCurrentScore(setMusicData, outputDiv, config);
  updateStatsUI();
}

export function getRenderedMeasuresCount(): number {
  return lastRenderedMeasuresCount;
}
