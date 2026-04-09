export interface MeasureCounts {
  trebleCounts: number[];
  bassCounts: number[];
}

function getGrandStaffCount(isTreble: boolean, notesPerStep: number, stepIndex: number, measureIdx: number): number {
  if (notesPerStep === 1) {
    const isTrebleTurn = (stepIndex + measureIdx) % 2 === 0;
    return isTreble === isTrebleTurn ? 1 : 0;
  }

  return isTreble ? Math.ceil(notesPerStep / 2) : Math.floor(notesPerStep / 2);
}

export function computeMeasureCounts(
  staffType: string,
  notesPerStep: number,
  measureIdx = 0,
  pattern: string[] = ['q', 'q', 'q', 'q'],
): MeasureCounts {
  const getCountsForStaff = (isTreble: boolean): number[] => pattern.map((_, stepIndex) => {
    if (staffType === (isTreble ? 'bass' : 'treble')) {
      return 0;
    }

    if (staffType !== 'grand') {
      return notesPerStep;
    }

    return getGrandStaffCount(isTreble, notesPerStep, stepIndex, measureIdx);
  });

  return {
    trebleCounts: getCountsForStaff(true),
    bassCounts: getCountsForStaff(false),
  };
}
