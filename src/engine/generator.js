import { DURATION_WEIGHTS, ALL_PIANO_NOTES, SCALES, ENHARMONIC_MAP, KEY_SIGNATURES } from '../constants/music.js';
import { getNoteValue, getEnharmonic } from '../utils/music-theory.js';

export function generateRhythmicPattern(selectedDurations) {
  const pattern = [];
  let remaining = 16;
  const allDurations = ['w', 'h', 'q', '8', '16'];
  
  while (remaining > 0) {
    const options = selectedDurations.filter(d => DURATION_WEIGHTS[d] <= remaining);
    let chosen;
    if (options.length > 0) {
      chosen = options[Math.floor(Math.random() * options.length)];
    } else {
      const fallbackOptions = allDurations.filter(d => DURATION_WEIGHTS[d] <= remaining);
      chosen = fallbackOptions[0];
    }
    pattern.push(chosen);
    remaining -= DURATION_WEIGHTS[chosen];
  }
  return pattern;
}

export function getRandomPitches(clef, count, minNote, maxNote, staffType, keySignature, isChromatic) {
  const minVal = getNoteValue(minNote);
  const maxVal = getNoteValue(maxNote);
  const midC = getNoteValue('C4');
  
  let validNotes = ALL_PIANO_NOTES.filter(n => {
    const v = getNoteValue(n);
    if (v < minVal || v > maxVal) return false;
    
    if (staffType === 'grand') {
      return clef === 'bass' ? v < midC : v >= midC;
    }
    return staffType === 'bass' ? v < midC : v >= midC;
  });

  if (validNotes.length === 0) return [];

  const scale = SCALES[keySignature] || SCALES['C'];
  let pool = isChromatic ? validNotes : validNotes.filter(n => {
    const name = n.match(/^[A-G][#b]*/)[0];
    return scale.includes(name) || (ENHARMONIC_MAP[name] && scale.includes(ENHARMONIC_MAP[name]));
  });
  if (pool.length === 0) pool = validNotes;

  const tempPool = [...pool];
  const selected = [];
  const iterations = Math.min(count, tempPool.length);

  for (let i = 0; i < iterations; i++) {
    const idx = Math.floor(Math.random() * tempPool.length);
    const note = tempPool.splice(idx, 1)[0];
    selected.push(getEnharmonic(note, keySignature, isChromatic));
  }
  
  return selected.sort((a, b) => getNoteValue(a) - getNoteValue(b));
}

export function computeMeasureCounts(staffType, notesPerStep, measureIndex = 0, pattern = ['q', 'q', 'q', 'q']) {
  return {
    trebleCounts: pattern.map((_, b) => {
      if (staffType === 'treble') return notesPerStep;
      if (staffType === 'bass') return 0;
      return notesPerStep === 1 ? ((b + measureIndex) % 2 === 0 ? 1 : 0) : Math.ceil(notesPerStep / 2);
    }),
    bassCounts: pattern.map((_, b) => {
      if (staffType === 'bass') return notesPerStep;
      if (staffType === 'treble') return 0;
      return notesPerStep === 1 ? ((b + measureIndex) % 2 === 0 ? 0 : 1) : Math.floor(notesPerStep / 2);
    })
  };
}

export function generateMusicData(config) {
  const {
    measuresPerLine,
    linesCount,
    staffType,
    notesPerBeat,
    minNote,
    maxNote,
    selectedNoteValues,
    selectedKeySignatures,
    isChromatic
  } = config;

  const actualKeys = (selectedKeySignatures || []).filter(k => KEY_SIGNATURES.includes(k));
  const availableKeys = actualKeys.length > 0 ? actualKeys : ['C'];

  const data = [];
  for (let l = 0; l < linesCount; l++) {
    const lineKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    for (let m = 0; m < measuresPerLine; m++) {
      const globalMeasureIdx = (l * measuresPerLine) + m;
      const pattern = generateRhythmicPattern(selectedNoteValues);
      const { trebleCounts, bassCounts } = computeMeasureCounts(staffType, notesPerBeat, globalMeasureIdx, pattern);
      const trebleBeats = [];
      const bassBeats = [];

      for (let b = 0; b < pattern.length; b++) {
        trebleBeats.push(trebleCounts[b] > 0 ? getRandomPitches('treble', trebleCounts[b], minNote, maxNote, staffType, lineKey, isChromatic) : []);
        bassBeats.push(bassCounts[b] > 0 ? getRandomPitches('bass', bassCounts[b], minNote, maxNote, staffType, lineKey, isChromatic) : []);
      }
      data.push({ trebleBeats, bassBeats, pattern, staffType, keySignature: lineKey });
    }
  }
  return data;
}
