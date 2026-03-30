import { Factory, Accidental, Beam } from 'vexflow';
import { WebMidi } from 'webmidi';

// Global state for music data and progress
export let musicData = [];
export let currentBeatIndex = 0;
export const activeMidiNotes = new Set();
export const suppressedNotes = new Set();

let lastRenderParams = null;
let cachedColWidths = null;

const NOTES_IN_OCTAVE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ALL_PIANO_NOTES = [];
for (let octave = 0; octave <= 8; octave++) {
  for (const n of NOTES_IN_OCTAVE) {
    const name = n + octave;
    // Piano starts at A0, ends at C8
    if (octave === 0 && (n === 'C' || n === 'C#' || n === 'D' || n === 'D#' || n === 'E' || n === 'F' || n === 'F#' || n === 'G' || n === 'G#')) continue;
    if (octave === 8 && n !== 'C') continue;
    ALL_PIANO_NOTES.push(name);
  }
}

const KEY_SIGNATURES = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'
];

const SCALES = {
  'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
  'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
  'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
  'Cb': ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb']
};

const DURATION_WEIGHTS = {
  'w': 16,
  'h': 8,
  'q': 4,
  '8': 2,
  '16': 1
};

/**
 * Generates a rhythmic pattern that fills a 4/4 measure.
 * @param {string[]} selectedDurations 
 * @returns {string[]}
 */
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
      // Fallback: pick the largest duration that fits from allDurations
      const fallbackOptions = allDurations.filter(d => DURATION_WEIGHTS[d] <= remaining);
      chosen = fallbackOptions[0]; // 'w' is first, but we want the largest fitting, which is actually the first in list if we order by weight
    }
    pattern.push(chosen);
    remaining -= DURATION_WEIGHTS[chosen];
  }
  return pattern;
}

/**
 * Returns a numeric value for a note to help with sorting and filtering.
 * Handles both sharp and flat names.
 * @param {string} note 
 * @returns {number}
 */
export function getNoteValue(note) {
  const match = note.match(/^([A-G][#b]*)(-?\d+)$/);
  if (!match) return -1;
  const name = match[1];
  const octave = parseInt(match[2]);
  
  const offsets = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
    'B#': 0, 'Cb': 11, 'Fb': 4, 'E#': 5 // Enharmonics that might appear in key signatures
  };
  
  let val = offsets[name];
  // Special case: B# is same as C but in next octave, Cb is same as B but in prev octave
  let octShift = 0;
  if (name === 'B#') octShift = 1;
  if (name === 'Cb') octShift = -1;
  
  return (octave + 1 + octShift) * 12 + val;
}

/**
 * Returns whether a note name is strictly in a given key signature's scale.
 * @param {string} noteName - e.g. 'C', 'C#', 'Db'
 * @param {string} keySignature - e.g. 'G'
 * @returns {boolean}
 */
export function isNoteInKey(noteName, keySignature) {
  const scale = SCALES[keySignature] || SCALES['C'];
  return scale.includes(noteName);
}

/**
 * Resets the global game state.
 */
export function resetGameState() {
  musicData = [];
  currentBeatIndex = 0;
  activeMidiNotes.clear();
  suppressedNotes.clear();
  lastRenderParams = null;
  cachedColWidths = null;
}

/**
 * Generates random pitches for VexFlow.
 * @param {string} clef - 'treble' or 'bass'
 * @param {number} count - number of unique pitches
 * @param {string} minNote - e.g. 'C2'
 * @param {string} maxNote - e.g. 'C6'
 * @param {string} staffType - 'grand', 'treble', or 'bass'
 * @param {string} keySignature - e.g. 'G'
 * @param {boolean} isChromatic - whether to allow non-diatonic notes
 * @returns {string[]}
 */
export function getRandomPitches(clef, count, minNote, maxNote, staffType, keySignature = 'C', isChromatic = false) {
  const minVal = getNoteValue(minNote);
  const maxVal = getNoteValue(maxNote);
  
  let options = [];

  if (!isChromatic) {
    // Pick strictly from the scale of the key signature to ensure correct note names (e.g. Bb vs A#)
    const scale = SCALES[keySignature] || SCALES['C'];
    ALL_PIANO_NOTES.forEach(n => {
      const val = getNoteValue(n);
      if (val < minVal || val > maxVal) return;
      
      const name = n.match(/^([A-G][#b]*)/)[1];
      // Check if this note (by name) is in the scale
      if (scale.includes(name)) {
        options.push(n);
      } else {
        // Handle enharmonics: if the semitone is in the scale, we might need to rename it
        const semitone = val % 12;
        const scaleNote = scale.find(sn => getNoteValue(sn + '4') % 12 === semitone);
        if (scaleNote) {
          // This ensures we use 'Bb' instead of 'A#' if 'Bb' is in the scale
          options.push(scaleNote + n.match(/\d+$/)[0]);
        }
      }
    });
  } else {
    // Chromatic: pick from all piano notes and randomly assign enharmonics
    options = ALL_PIANO_NOTES.filter(n => {
      const val = getNoteValue(n);
      return val >= minVal && val <= maxVal;
    }).map(n => {
      const name = n.match(/^([A-G][#b]*)/)[1];
      if (name.includes('#')) {
        const flatNames = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
        const isFlatKey = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(keySignature);
        const isSharpKey = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'].includes(keySignature);
        
        // Probability of picking a flat instead of sharp
        let probabilityOfFlat = 0.5;
        if (isFlatKey) probabilityOfFlat = 0.8;
        if (isSharpKey) probabilityOfFlat = 0.2;
        
        if (Math.random() < probabilityOfFlat) {
          const newName = flatNames[name];
          if (newName) return newName + n.match(/\d+$/)[0];
        }
      }
      return n;
    });
  }

  // Filter by clef/staffType
  if (staffType === 'grand') {
    const middleC = getNoteValue('C4');
    if (clef === 'treble') {
      options = options.filter(n => getNoteValue(n) >= middleC);
    } else {
      options = options.filter(n => getNoteValue(n) < middleC);
    }
  }
  
  // Deduplicate options (renaming might have created duplicates)
  options = Array.from(new Set(options));

  // Fallback if no options found (shouldn't happen with correct ranges)
  if (options.length === 0) {
    options = ALL_PIANO_NOTES.filter(n => {
      const val = getNoteValue(n);
      if (val < minVal || val > maxVal) return false;
      if (staffType === 'grand') {
        const middleC = getNoteValue('C4');
        if (clef === 'treble') return val >= middleC;
        return val < middleC;
      }
      return true;
    });
  }
  
  const selected = [];
  const pool = [...options];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }

  return selected.sort((a, b) => getNoteValue(a) - getNoteValue(b));
}


/**
 * Compute per-step note distribution for a single measure.
 * @param {string} staffType
 * @param {number} notesPerStep
 * @param {number} measureIndex
 * @param {string[]} pattern
 * @returns {{trebleCounts:number[], bassCounts:number[]}}
 */
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
        // Alternate between treble and bass based on measure and step index.
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

/**
 * Sets the current beat index.
 * @param {number} index 
 */
export function setCurrentBeatIndex(index) {
  currentBeatIndex = index;
}

/**
 * Sets the music data structure.
 * @param {Array} data 
 */
export function setMusicData(data) {
  musicData = data.map(m => ({
    ...m,
    pattern: m.pattern || (m.trebleBeats ? m.trebleBeats.map(() => 'q') : ['q', 'q', 'q', 'q'])
  }));
}

/**
 * Generates the music data structure based on current configuration.
 */
export function generateMusicData() {
  const measuresPerLine = parseInt(document.getElementById('measures-per-line')?.value || '4');
  const notesPerBeat = parseInt(document.getElementById('notes-per-beat')?.value || '1');
  const linesCount = parseInt(document.getElementById('lines')?.value || '1');
  const staffType = document.getElementById('staff-type')?.value || 'grand';
  const minNote = document.getElementById('min-note')?.value || 'C2';
  const maxNote = document.getElementById('max-note')?.value || 'C6';

  // Get selected note values
  const noteValuesContainer = document.getElementById('note-values');
  let selectedNoteValues = ['q'];
  if (noteValuesContainer) {
    const checked = Array.from(noteValuesContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    if (checked.length > 0) selectedNoteValues = checked;
  }

  // Get selected key signatures
  const keyContainer = document.getElementById('key-signatures');
  let selectedKeys = [];
  if (keyContainer) {
    selectedKeys = Array.from(keyContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
  }
  
  const isChromatic = selectedKeys.includes('Chromatic');
  const actualKeys = selectedKeys.filter(k => k !== 'Chromatic');
  const availableKeys = actualKeys.length > 0 ? actualKeys : ['C'];

  const totalMeasures = measuresPerLine * linesCount;
  const data = [];

  for (let l = 0; l < linesCount; l++) {
    // Pick a random key for this line
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
  musicData = data;
  currentBeatIndex = 0;
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
    const stepsInMeasure = musicData[m].pattern.length;
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

/**
 * Resets the music state and re-renders.
 * @param {HTMLElement} [outputDiv] - Optional div to render into.
 */
export function regenerateAndRender(outputDiv) {
  generateMusicData();
  renderStaff(outputDiv);
}

/**
 * Renders the music staff based on current selector values.
 * @param {HTMLElement} [outputDiv] - Optional div to render into.
 */
export function renderStaff(outputDiv) {
  const div = outputDiv || document.getElementById('output');
  if (!div) return;
  
  if (musicData.length === 0) {
    generateMusicData();
  }

  // Clear previous content
  div.innerHTML = '';
  
  const measuresPerLine = parseInt(document.getElementById('measures-per-line')?.value || '4');
  const linesCount = parseInt(document.getElementById('lines')?.value || '1');
  const staffType = document.getElementById('staff-type')?.value || 'grand';

  // Check cache for column widths
  // Ensure the div has an ID
  if (!div.id) {
    div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);
  }

  // Helper to format voices for a measure (used in both passes)
  const getTargetNotes = (score, measureData, mIdx, isTreble, currentNotesArray) => {
    return measureData[isTreble ? 'trebleBeats' : 'bassBeats'].map((pitches, bIdx) => {
      const duration = measureData.pattern[bIdx];
      const info = getStepInfo(currentBeatIndex);
      const isCurrent = (info && info.measureIdx === mIdx && info.stepIdx === bIdx);
      if (pitches.length === 0) {
        const restPitch = isTreble ? 'B4' : 'D3';
        const notes = score.notes(`${restPitch}/${duration}/r`, { 
          clef: isTreble ? 'treble' : 'bass' 
        });
        const note = notes[0];
        if (isCurrent && currentNotesArray) currentNotesArray.push(note);
        return note;
      } else {
        const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
        const notes = score.notes(noteStr, { 
          stem: isTreble ? 'up' : 'down',
          clef: isTreble ? 'treble' : 'bass'
        });
        if (isCurrent && currentNotesArray) currentNotesArray.push(notes[0]);
        return notes[0];
      }
    });
  };

  const currentParams = JSON.stringify({ musicData, measuresPerLine, linesCount, staffType });
  if (lastRenderParams !== currentParams) {
    // FIRST PASS: Calculate required widths for each column
    const colWidths = new Array(measuresPerLine).fill(200);
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.display = 'none';
    document.body.appendChild(hiddenDiv);
    hiddenDiv.id = 'temp-vf-' + Math.random().toString(36).substring(2, 9);

    const tempVf = new Factory({ renderer: { elementId: hiddenDiv.id, width: 5000, height: 5000 } });
    const tempScore = tempVf.EasyScore();

    for (let m = 0; m < measuresPerLine; m++) {
      for (let l = 0; l < linesCount; l++) {
        const measureIdx = (l * measuresPerLine) + m;
        const measureData = musicData[measureIdx];
        if (!measureData) continue;

        const system = tempVf.System({ x: 0, y: 0 }); // autoWidth enabled by default when width is undefined
        
        if (staffType === 'treble' || staffType === 'grand') {
          const targetNotes = getTargetNotes(tempScore, measureData, measureIdx, true, null);
          const voices = [tempVf.Voice().setMode(2).addTickables(targetNotes)];
          Accidental.applyAccidentals(voices, measureData.keySignature || 'C');
          const stave = system.addStave({ voices });
          if (m === 0) {
            stave.addClef('treble').addTimeSignature('4/4');
            if (measureData.keySignature && measureData.keySignature !== 'C') {
              stave.addKeySignature(measureData.keySignature);
            }
          }
        }
        if (staffType === 'bass' || staffType === 'grand') {
          const targetNotes = getTargetNotes(tempScore, measureData, measureIdx, false, null);
          const voices = [tempVf.Voice().setMode(2).addTickables(targetNotes)];
          Accidental.applyAccidentals(voices, measureData.keySignature || 'C');
          const stave = system.addStave({ voices });
          if (m === 0) {
            stave.addClef('bass').addTimeSignature('4/4');
            if (measureData.keySignature && measureData.keySignature !== 'C') {
              stave.addKeySignature(measureData.keySignature);
            }
          }
        }
        
        system.format();
        colWidths[m] = Math.max(colWidths[m], system.options.width);
        tempVf.reset();
        hiddenDiv.innerHTML = '';
      }
    }
    document.body.removeChild(hiddenDiv);
    cachedColWidths = colWidths;
    lastRenderParams = currentParams;
  }

  const colWidths = cachedColWidths;
  const padding = 100;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + padding;
  const heightPerLine = staffType === 'grand' ? 250 : 150;
  const totalHeight = (linesCount * heightPerLine) + 100;

  const vf = new Factory({ 
    renderer: { 
      elementId: div.id, 
      width: totalWidth, 
      height: totalHeight 
    } 
  });
  
  const score = vf.EasyScore();
  const currentNotes = [];

  for (let l = 0; l < linesCount; l++) {
    const y = 50 + (l * heightPerLine);
    let currentX = 50;
    
    for (let m = 0; m < measuresPerLine; m++) {
      const measureIdx = (l * measuresPerLine) + m;
      const measureData = musicData[measureIdx];
      if (!measureData) continue;

      const width = colWidths[m];
      const x = currentX;
      currentX += width;

      const system = vf.System({ x, y, width });
      
      const formatTargetVoice = (beatsData, isTreble) => {
        return getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes);
      };

      const formatPlayedVoice = (isTreble, targetNotesForStave) => {
        const beats = [];
        let hasRealNote = false;
        const info = getStepInfo(currentBeatIndex);
        for (let b = 0; b < measureData.pattern.length; b++) {
          const duration = measureData.pattern[b];
          const isCurrent = (info && info.measureIdx === measureIdx && info.stepIdx === b);
          if (isCurrent && activeMidiNotes.size > 0) {
            const targetPitches = isTreble ? measureData.trebleBeats[b] : measureData.bassBeats[b];
            
            const pitches = Array.from(activeMidiNotes).filter(p => {
              // If still suppressed, don't show wrong notes
              if (suppressedNotes.has(p) && !targetPitches.includes(p)) return false;
              
              const octave = parseInt(p.slice(-1));
              if (staffType === 'treble') return isTreble;
              if (staffType === 'bass') return !isTreble;
              if (isTreble) return octave >= 4;
              return octave < 4;
            });

            if (pitches.length > 0) {
              const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
              const notes = score.notes(noteStr, { 
                stem: isTreble ? 'up' : 'down',
                clef: isTreble ? 'treble' : 'bass'
              });
              const note = notes[0];
              
              pitches.forEach((p, idx) => {
                if (!targetPitches.includes(p)) {
                  note.setKeyStyle(idx, { fillStyle: 'rgba(128, 128, 128, 0.4)', strokeStyle: 'rgba(128, 128, 128, 0.4)' });
                }
              });

              // Align with the target note on the same beat
              const targetNote = targetNotesForStave[b];
              if (targetNote) {
                const originalDraw = note.draw.bind(note);
                note.draw = () => {
                  const targetX = targetNote.getAbsoluteX();
                  const currentX = note.getAbsoluteX();
                  note.setXShift(targetX - currentX);
                  originalDraw();
                };
              }
              
              note.getWidth = () => 0;
              beats.push(note);
              hasRealNote = true;
            } else {
              beats.push(vf.GhostNote({ duration }));
            }
          } else {
            beats.push(vf.GhostNote({ duration }));
          }
        }
        return { beats, hasRealNote };
      };

      if (staffType === 'treble' || staffType === 'grand') {
        const targetNotes = formatTargetVoice(measureData.trebleBeats, true);
        const { beats: playedNotes, hasRealNote } = formatPlayedVoice(true, targetNotes);
        const voices = [vf.Voice().setMode(2).addTickables(targetNotes)];
        if (hasRealNote) {
          voices.push(vf.Voice().setMode(2).addTickables(playedNotes));
        }
        Accidental.applyAccidentals(voices, measureData.keySignature || 'C');
        Beam.generateBeams(targetNotes).forEach(beam => vf.renderQ.push(beam));
        const stave = system.addStave({ voices });
        if (m === 0) {
          stave.addClef('treble').addTimeSignature('4/4');
          if (measureData.keySignature && measureData.keySignature !== 'C') {
            stave.addKeySignature(measureData.keySignature);
          }
        }
      }
      
      if (staffType === 'bass' || staffType === 'grand') {
        const targetNotes = formatTargetVoice(measureData.bassBeats, false);
        const { beats: playedNotes, hasRealNote } = formatPlayedVoice(false, targetNotes);
        const voices = [vf.Voice().setMode(2).addTickables(targetNotes)];
        if (hasRealNote) {
          voices.push(vf.Voice().setMode(2).addTickables(playedNotes));
        }
        Accidental.applyAccidentals(voices, measureData.keySignature || 'C');
        Beam.generateBeams(targetNotes).forEach(beam => vf.renderQ.push(beam));
        const stave = system.addStave({ voices });
        if (m === 0) {
          stave.addClef('bass').addTimeSignature('4/4');
          if (measureData.keySignature && measureData.keySignature !== 'C') {
            stave.addKeySignature(measureData.keySignature);
          }
        }
      }
      
      const isLastMeasure = (measureIdx === musicData.length - 1);
      
      if (staffType === 'grand') {
        if (m === 0) system.addConnector('brace');
        system.addConnector(isLastMeasure ? 'boldDoubleRight' : 'singleRight');
      }
      
      if (m === 0) {
        system.addConnector('singleLeft');
      }
      
      if (m === measuresPerLine - 1 && staffType !== 'grand') {
        system.addConnector(isLastMeasure ? 'boldDoubleRight' : 'singleRight');
      }
    }
  }
  
  vf.draw();

  // Add highlight for the current beat
  drawHighlight(vf, currentNotes, staffType);
}

/**
 * Draws a highlight rectangle over the current beat.
 */
function drawHighlight(vf, currentNotes, staffType) {
  if (currentNotes.length === 0) return;

  const context = vf.getContext();
  
  // Find the note with the absolute X
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  currentNotes.forEach(note => {
     const x = note.getAbsoluteX();
     // We want a box that covers the beat area.
     // StaveNote x is the notehead.
     minX = Math.min(minX, x - 15);
     maxX = Math.max(maxX, x + 35);
     
     const bb = note.getBoundingBox();
     minY = Math.min(minY, bb.getY());
     maxY = Math.max(maxY, bb.getY() + bb.getH());
  });

  // For the highlight, we want it to span the whole staff height
  // Actually, we can use the stave's Y if we had it.
  // But we can estimate it.
  const y = minY - 20;
  const height = (maxY - minY) + 40;
  
  context.save();
  context.setFillStyle('rgba(173, 216, 230, 0.4)');
  context.fillRect(minX, y, maxX - minX, height);
  context.restore();
}

/**
 * Initializes MIDI detection.
 */
export function initMIDI() {
  const deviceNameEl = document.getElementById('midi-device-name');
  const indicatorEl = document.getElementById('midi-indicator');
  const noteDisplayEl = document.getElementById('current-note');

  if (!deviceNameEl || !indicatorEl || !noteDisplayEl) return;

  const updateStatus = () => {
    if (WebMidi.inputs.length > 0) {
      deviceNameEl.textContent = WebMidi.inputs[0].name;
      indicatorEl.style.backgroundColor = 'green';
    } else {
      deviceNameEl.textContent = 'No device connected';
      indicatorEl.style.backgroundColor = 'red';
      // Clear active notes when no device is connected
      activeMidiNotes.clear();
      suppressedNotes.clear();
      noteDisplayEl.textContent = '-';
      renderStaff();
    }
  };

  const onNoteOn = (e) => {
    activeMidiNotes.add(e.note.identifier);
    
    // Check if we should stop suppressing wrong notes
    const info = getStepInfo(currentBeatIndex);
    const measureData = info ? musicData[info.measureIdx] : null;
    if (measureData) {
      const targetPitches = [
        ...(measureData.trebleBeats[info.stepIdx] || []), 
        ...(measureData.bassBeats[info.stepIdx] || [])
      ];
      if (!targetPitches.includes(e.note.identifier)) {
        suppressedNotes.clear();
      }
    }

    noteDisplayEl.textContent = Array.from(activeMidiNotes).join(', ');
    checkMatch();
    renderStaff();
  };

  const onNoteOff = (e) => {
    activeMidiNotes.delete(e.note.identifier);
    suppressedNotes.delete(e.note.identifier);
    if (activeMidiNotes.size === 0) {
      noteDisplayEl.textContent = '-';
    } else {
      noteDisplayEl.textContent = Array.from(activeMidiNotes).join(', ');
    }
    checkMatch();
    renderStaff();
  };

  const checkMatch = () => {
    const info = getStepInfo(currentBeatIndex);
    const measureData = info ? musicData[info.measureIdx] : null;
    if (!measureData) return;

    const targetNotes = Array.from(new Set([
      ...(measureData.trebleBeats[info.stepIdx] || []), 
      ...(measureData.bassBeats[info.stepIdx] || [])
    ]));
    const targetVals = targetNotes.map(getNoteValue);
    const activeVals = Array.from(activeMidiNotes).map(getNoteValue);
    
    // Check if activeVals exactly match targetVals
    if (activeVals.length === targetVals.length && targetVals.every(v => activeVals.includes(v))) {
      currentBeatIndex++;
      
      // If we reached the end, regenerate music
      if (currentBeatIndex >= getTotalSteps()) {
          generateMusicData();
      }

      // Suppress currently held notes so they don't show as wrong on the next beat
      activeMidiNotes.forEach(n => suppressedNotes.add(n));
    }
  };

  const addInputListeners = (input) => {
    input.removeListener('noteon');
    input.removeListener('noteoff');
    input.addListener('noteon', onNoteOn);
    input.addListener('noteoff', onNoteOff);
  };

  WebMidi.enable().then(() => {
    updateStatus();
    
    WebMidi.inputs.forEach(addInputListeners);

    WebMidi.addListener('connected', (e) => {
      if (e.port.type === 'input') {
        addInputListeners(e.port);
      }
      updateStatus();
    });

    WebMidi.addListener('disconnected', () => {
      updateStatus();
    });
  }).catch(err => {
    console.error('MIDI could not be enabled:', err);
    deviceNameEl.textContent = 'MIDI Error: ' + err.message;
  });
}

/**
 * Updates the min and max note selectors based on the current staff type.
 */
export function updateNoteSelectors() {
  const staffType = document.getElementById('staff-type')?.value || 'grand';
  const minSelect = document.getElementById('min-note');
  const maxSelect = document.getElementById('max-note');
  if (!minSelect || !maxSelect) return;

  const prevMin = minSelect.value;
  const prevMax = maxSelect.value;

  let filteredNotes = ALL_PIANO_NOTES;
  let defaultMin = 'C2';
  let defaultMax = 'C6';

  if (staffType === 'treble') {
    const minVal = getNoteValue('C3');
    const maxVal = getNoteValue('C6');
    filteredNotes = ALL_PIANO_NOTES.filter(n => {
      const v = getNoteValue(n);
      return v >= minVal && v <= maxVal;
    });
    defaultMin = 'C3';
    defaultMax = 'C6';
  } else if (staffType === 'bass') {
    const minVal = getNoteValue('C1');
    const maxVal = getNoteValue('C5');
    filteredNotes = ALL_PIANO_NOTES.filter(n => {
      const v = getNoteValue(n);
      return v >= minVal && v <= maxVal;
    });
    defaultMin = 'C1';
    defaultMax = 'C5';
  }

  minSelect.innerHTML = '';
  maxSelect.innerHTML = '';

  filteredNotes.forEach(note => {
    const opt1 = document.createElement('option');
    opt1.value = note;
    opt1.textContent = note;
    minSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = note;
    opt2.textContent = note;
    maxSelect.appendChild(opt2);
  });

  const isValueInRange = (val) => filteredNotes.some(n => n === val);
  minSelect.value = isValueInRange(prevMin) ? prevMin : defaultMin;
  maxSelect.value = isValueInRange(prevMax) ? prevMax : defaultMax;
}

/**
 * Initializes the key signature checkboxes.
 */
export function initKeySignatures() {
  const container = document.getElementById('key-signatures');
  if (!container) return;

  container.innerHTML = '';
  const choices = [...KEY_SIGNATURES, 'Chromatic'];
  
  choices.forEach(key => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '3px';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = key;
    cb.id = 'key-' + key;
    if (key === 'C') cb.checked = true;
    
    cb.addEventListener('change', () => {
      regenerateAndRender();
    });

    const label = document.createElement('label');
    label.htmlFor = 'key-' + key;
    label.textContent = key;
    label.style.cursor = 'pointer';

    wrapper.appendChild(cb);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
}

// Automatically initialize if we're in a browser environment.
if (typeof document !== 'undefined') {
  updateNoteSelectors();
  initKeySignatures();

  const selectors = ['measures-per-line', 'notes-per-beat', 'lines', 'staff-type', 'min-note', 'max-note'];
  selectors.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id === 'staff-type') {
        updateNoteSelectors();
      }
      regenerateAndRender();
    });
  });
  
  regenerateAndRender();
  initMIDI();
}
