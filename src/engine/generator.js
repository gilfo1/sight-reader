import { DURATION_WEIGHTS, ALL_PIANO_NOTES, SCALES } from '../constants/music.js';
import { getNoteValue } from '../utils/music-theory.js';

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
  
  let validNotes = ALL_PIANO_NOTES.filter(n => {
    const v = getNoteValue(n);
    return v >= minVal && v <= maxVal;
  });

  if (staffType === 'grand') {
    if (clef === 'bass') {
      validNotes = validNotes.filter(n => getNoteValue(n) < getNoteValue('C4'));
    } else {
      validNotes = validNotes.filter(n => getNoteValue(n) >= getNoteValue('C4'));
    }
  } else if (staffType === 'bass') {
    validNotes = validNotes.filter(n => getNoteValue(n) < getNoteValue('C4'));
  } else {
    validNotes = validNotes.filter(n => getNoteValue(n) >= getNoteValue('C4'));
  }

  if (validNotes.length === 0) return [];

  const scale = SCALES[keySignature] || SCALES['C'];
  let pool;
  if (isChromatic) {
    pool = validNotes;
  } else {
    pool = validNotes.filter(n => {
      const nameOnly = n.match(/^[A-G][#b]*/)[0];
      return scale.includes(nameOnly);
    });
    if (pool.length === 0) pool = validNotes;
  }

  const selected = [];
  const actualCount = Math.min(count, pool.length);
  
  // If we want fewer notes than pool, pick random ones.
  // If we want more or equal, just take the pool (as unique notes).
  // Actually, the test suggests if count exceeds pool, we take unique notes from pool.
  if (count >= pool.length) {
    pool.forEach(n => {
      let note = n;
      if (isChromatic && note.includes('#')) {
         const hasSharps = keySignature.includes('#') || ['G', 'D', 'A', 'E', 'B'].includes(keySignature);
         const hasFlats = keySignature.includes('b') || ['F'].includes(keySignature);
         const r = Math.random();
         let useFlat = hasFlats ? r < 0.8 : (hasSharps ? r < 0.2 : r < 0.5);
         if (useFlat) {
            const enharmonics = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
            const base = note.slice(0, 2);
            const oct = note.slice(2);
            if (enharmonics[base]) note = enharmonics[base] + oct;
         }
      }
      selected.push(note);
    });
  } else {
    const tempPool = [...pool];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * tempPool.length);
      let note = tempPool.splice(idx, 1)[0];
      
      if (isChromatic && note.includes('#')) {
        const hasSharps = keySignature.includes('#') || ['G', 'D', 'A', 'E', 'B'].includes(keySignature);
        const hasFlats = keySignature.includes('b') || ['F'].includes(keySignature);
        const r = Math.random();
        let useFlat = hasFlats ? r < 0.8 : (hasSharps ? r < 0.2 : r < 0.5);

        if (useFlat) {
          const enharmonics = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
          const base = note.slice(0, 2);
          const oct = note.slice(2);
          if (enharmonics[base]) note = enharmonics[base] + oct;
        }
      }
      selected.push(note);
    }
  }
  return selected.sort((a, b) => getNoteValue(a) - getNoteValue(b));
}

export function computeMeasureCounts(staffType, notesPerStep, measureIndex = 0, pattern = ['q', 'q', 'q', 'q']) {
  const trebleCounts = [];
  const bassCounts = [];
  for (let b = 0; b < pattern.length; b++) {
    if (staffType === 'treble') {
      trebleCounts.push(notesPerStep);
      bassCounts.push(0);
    } else if (staffType === 'bass') {
      trebleCounts.push(0);
      bassCounts.push(notesPerStep);
    } else if (staffType === 'grand') {
      if (notesPerStep === 1) {
        if ((b + measureIndex) % 2 === 0) {
          trebleCounts.push(1);
          bassCounts.push(0);
        } else {
          trebleCounts.push(0);
          bassCounts.push(1);
        }
      } else {
        trebleCounts.push(Math.ceil(notesPerStep / 2));
        bassCounts.push(Math.floor(notesPerStep / 2));
      }
    }
  }
  return { trebleCounts, bassCounts };
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

  const actualKeys = selectedKeySignatures.filter(k => k !== 'Chromatic');
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
