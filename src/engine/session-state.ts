import type { Measure, StepLocation } from '@/engine/types';

export const musicData: Measure[] = [];
export let currentStepIndex = 0;
export const activeMidiNotes: Set<string> = new Set();
export const suppressedNotes: Set<string> = new Set();

export function setMusicData(data: Measure[]): void {
  musicData.length = 0;
  musicData.push(...data);
}

export function setCurrentStepIndex(index: number): void {
  currentStepIndex = index;
}

export function resetSessionState(): void {
  currentStepIndex = 0;
  suppressedNotes.clear();
  activeMidiNotes.clear();
  musicData.length = 0;
}

export function getStepInfo(index: number): StepLocation | null {
  if (index < 0) {
    return null;
  }

  let stepOffset = 0;

  for (let measureIdx = 0; measureIdx < musicData.length; measureIdx++) {
    const measure = musicData[measureIdx];
    const stepCount = measure?.pattern.length ?? 0;

    if (index < stepOffset + stepCount) {
      return {
        measureIdx,
        stepIdx: index - stepOffset,
      };
    }

    stepOffset += stepCount;
  }

  return null;
}

export function getTargetNotesAtStep(index: number): string[] {
  const stepInfo = getStepInfo(index);

  if (!stepInfo) {
    return [];
  }

  const measure = musicData[stepInfo.measureIdx];

  if (!measure) {
    return [];
  }

  return Array.from(
    new Set([
      ...(measure.trebleSteps[stepInfo.stepIdx] ?? []),
      ...(measure.bassSteps[stepInfo.stepIdx] ?? []),
    ]),
  );
}

export function getTotalSteps(): number {
  return musicData.reduce((total, measure) => total + (measure.pattern?.length ?? 0), 0);
}
