import { DURATION_WEIGHTS } from '@/constants/music';

const FALLBACK_DURATIONS = ['w', 'h', 'q', '8', '16'];
const MEASURE_DURATION_WEIGHT = 16;

function getDurationsThatFit(remainingWeight: number, durations: string[]): string[] {
  return durations.filter((duration) => (DURATION_WEIGHTS[duration] ?? 0) <= remainingWeight);
}

export function generateRhythmicPattern(selectedDurations: string[]): string[] {
  const pattern: string[] = [];
  let remainingWeight = MEASURE_DURATION_WEIGHT;

  while (remainingWeight > 0) {
    const availableDurations = getDurationsThatFit(remainingWeight, selectedDurations);
    const chosenDuration = availableDurations.length > 0
      ? availableDurations[Math.floor(Math.random() * availableDurations.length)]!
      : getDurationsThatFit(remainingWeight, FALLBACK_DURATIONS)[0]!;

    pattern.push(chosenDuration);
    remainingWeight -= DURATION_WEIGHTS[chosenDuration] ?? 0;
  }

  return pattern;
}
