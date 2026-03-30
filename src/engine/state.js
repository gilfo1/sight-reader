// Global state for music data and progress
export const musicData = [];
export let currentBeatIndex = 0;
export const activeMidiNotes = new Set();
export const suppressedNotes = new Set();

export function setMusicData(data) {
  const processedData = data.map(m => {
    // If it's the legacy steps structure, convert it
    if (m.steps && !m.trebleBeats) {
      return {
        ...m,
        trebleBeats: m.steps.map(s => s.treblePitches || []),
        bassBeats: m.steps.map(s => s.bassPitches || []),
        pattern: m.steps.map(s => s.duration || 'q')
      };
    }
    // Ensure pattern is always present
    if (!m.pattern && m.trebleBeats) {
      return { ...m, pattern: m.trebleBeats.map(() => 'q') };
    }
    return m;
  });
  
  musicData.length = 0;
  musicData.push(...processedData);
}

export function setCurrentBeatIndex(index) {
  currentBeatIndex = index;
}

export function resetGameState() {
  currentBeatIndex = 0;
  suppressedNotes.clear();
  activeMidiNotes.clear();
  musicData.length = 0;
}

/**
 * Gets the measure and step index for a global step index.
 * @param {number} index 
 * @returns {{measureIdx: number, stepIdx: number} | null}
 */
export function getStepInfo(index) {
  if (index < 0) return null;
  let count = 0;
  for (let m = 0; m < musicData.length; m++) {
    const measure = musicData[m];
    if (!measure) continue;
    const stepsInMeasure = (measure.pattern || []).length;
    if (index < count + stepsInMeasure) {
      return { measureIdx: m, stepIdx: index - count };
    }
    count += stepsInMeasure;
  }
  return null;
}

/**
 * Gets the total number of steps in the music data.
 * @returns {number}
 */
export function getTotalSteps() {
  return musicData.reduce((acc, m) => acc + (m.pattern?.length || 0), 0);
}
