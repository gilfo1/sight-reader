import { Factory } from 'vexflow';
import { WebMidi } from 'webmidi';

// Global state for music data and progress
export let musicData = [];
export let currentBeatIndex = 0;
export const activeMidiNotes = new Set();
export const suppressedNotes = new Set();

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

/**
 * Returns a numeric value for a note to help with sorting and filtering.
 * @param {string} note 
 * @returns {number}
 */
function getNoteValue(note) {
  const name = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  return (octave * 12) + NOTES_IN_OCTAVE.indexOf(name);
}

/**
 * Resets the global game state.
 */
export function resetGameState() {
  musicData = [];
  currentBeatIndex = 0;
  activeMidiNotes.clear();
  suppressedNotes.clear();
}

/**
 * Generates random pitches for VexFlow.
 * @param {string} clef - 'treble' or 'bass'
 * @param {number} count - number of unique pitches
 * @param {string} minNote - e.g. 'C2'
 * @param {string} maxNote - e.g. 'C6'
 * @param {string} staffType - 'grand', 'treble', or 'bass'
 * @returns {string[]}
 */
function getRandomPitches(clef, count, minNote, maxNote, staffType) {
  const minVal = getNoteValue(minNote);
  const maxVal = getNoteValue(maxNote);
  
  let options = ALL_PIANO_NOTES.filter(n => {
    const val = getNoteValue(n);
    return val >= minVal && val <= maxVal;
  });

  if (staffType === 'grand') {
    const middleC = getNoteValue('C4');
    if (clef === 'treble') {
      options = options.filter(n => getNoteValue(n) >= middleC);
    } else {
      options = options.filter(n => getNoteValue(n) <= middleC);
    }
    
    // If we filtered too much and have no options, revert to full range for that clef
    if (options.length === 0) {
      options = ALL_PIANO_NOTES.filter(n => {
        const val = getNoteValue(n);
        return val >= minVal && val <= maxVal;
      });
    }
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
 * Generates a string of 4 random quarter beats (single notes or chords).
 * @param {string} clef - 'treble' or 'bass'
 * @param {number|number[]} noteCounts - number of notes per beat (or array of 4 counts)
 * @returns {string}
 */
function getRandomMeasureNotes(clef = 'treble', noteCounts = 1) {
  const beats = [];
  const restPitch = clef === 'treble' ? 'B4' : 'D3';
  const counts = Array.isArray(noteCounts) ? noteCounts : Array(4).fill(noteCounts);
  for (let b = 0; b < 4; b++) {
    const count = counts[b];
    if (count === 0) {
      // Use rests for empty beats.
      beats.push(`${restPitch}/q/r`);
    } else {
      const pitches = getRandomPitches(clef, count);
      if (count > 1) {
        beats.push(`(${pitches.join(' ')})/q`);
      } else {
        beats.push(`${pitches[0]}/q`);
      }
    }
  }
  return beats.join(', ');
}

/**
 * Compute per-beat note distribution for a single measure.
 * - For 'treble' or 'bass', all beats go to the selected staff.
 * - For 'grand' with notesPerBeat = 1, put notes on bass only (deterministic).
 * - For 'grand' with notesPerBeat > 1, split ceil/floor between treble/bass.
 * @param {string} staffType
 * @param {number} notesPerBeat
 * @param {number} measureIndex
 * @returns {{trebleCounts:number[], bassCounts:number[]}}
 */
export function computeMeasureCounts(staffType, notesPerBeat, measureIndex = 0) {
  const trebleCounts = [];
  const bassCounts = [];
  for (let b = 0; b < 4; b++) {
    if (staffType === 'treble') {
      trebleCounts.push(notesPerBeat);
      bassCounts.push(0);
    } else if (staffType === 'bass') {
      trebleCounts.push(0);
      bassCounts.push(notesPerBeat);
    } else if (staffType === 'grand') {
      if (notesPerBeat === 1) {
        // Alternate between treble and bass based on measure and beat index.
        if ((b + measureIndex) % 2 === 0) {
          trebleCounts.push(1);
          bassCounts.push(0);
        } else {
          trebleCounts.push(0);
          bassCounts.push(1);
        }
      } else {
        trebleCounts.push(Math.ceil(notesPerBeat / 2));
        bassCounts.push(Math.floor(notesPerBeat / 2));
      }
    }
  }
  return { trebleCounts, bassCounts };
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

  const totalMeasures = measuresPerLine * linesCount;
  const data = [];

  for (let m = 0; m < totalMeasures; m++) {
    const { trebleCounts, bassCounts } = computeMeasureCounts(staffType, notesPerBeat, m);
    const trebleBeats = [];
    const bassBeats = [];

    for (let b = 0; b < 4; b++) {
      trebleBeats.push(trebleCounts[b] > 0 ? getRandomPitches('treble', trebleCounts[b], minNote, maxNote, staffType) : []);
      bassBeats.push(bassCounts[b] > 0 ? getRandomPitches('bass', bassCounts[b], minNote, maxNote, staffType) : []);
    }
    data.push({ trebleBeats, bassBeats, staffType });
  }
  musicData = data;
  currentBeatIndex = 0;
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

  // Ensure the div has an ID
  if (!div.id) {
    div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);
  }
  
  const widthPerMeasure = 200;
  const padding = 100;
  const totalWidth = (measuresPerLine * widthPerMeasure) + padding;
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
    
    for (let m = 0; m < measuresPerLine; m++) {
      const measureIdx = (l * measuresPerLine) + m;
      const measureData = musicData[measureIdx];
      if (!measureData) continue;

      const x = 50 + (m * widthPerMeasure);
      const system = vf.System({ x, y, width: widthPerMeasure });
      
      const formatTargetVoice = (beatsData, isTreble) => {
        return beatsData.map((pitches, bIdx) => {
          const absBeatIdx = (measureIdx * 4) + bIdx;
          const isCurrent = (absBeatIdx === currentBeatIndex);
          if (pitches.length === 0) {
            const restPitch = isTreble ? 'B4' : 'D3';
            const notes = score.notes(`${restPitch}/q/r`, { 
              clef: isTreble ? 'treble' : 'bass' 
            });
            const note = notes[0];
            if (isCurrent) currentNotes.push(note);
            return note;
          } else {
            const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/q` : `${pitches[0]}/q`;
            const notes = score.notes(noteStr, { 
              stem: isTreble ? 'up' : 'down',
              clef: isTreble ? 'treble' : 'bass'
            });
            if (isCurrent) currentNotes.push(notes[0]);
            return notes[0];
          }
        });
      };

      const formatPlayedVoice = (isTreble, targetNotesForStave) => {
        const beats = [];
        let hasRealNote = false;
        for (let b = 0; b < 4; b++) {
          const absBeatIdx = (measureIdx * 4) + b;
          if (absBeatIdx === currentBeatIndex && activeMidiNotes.size > 0) {
            const targetPitches = isTreble ? measureData.trebleBeats[b] : measureData.bassBeats[b];
            
            // Check if we should suppress grey notes
            const hasNewWrongNote = Array.from(activeMidiNotes).some(p => 
              !targetPitches.includes(p) && !suppressedNotes.has(p)
            );
            
            if (hasNewWrongNote) {
              suppressedNotes.clear();
            }

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
              const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/q` : `${pitches[0]}/q`;
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
              beats.push(vf.GhostNote({ duration: 'q' }));
            }
          } else {
            beats.push(vf.GhostNote({ duration: 'q' }));
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
        const stave = system.addStave({ voices });
        if (m === 0) stave.addClef('treble').addTimeSignature('4/4');
      }
      
      if (staffType === 'bass' || staffType === 'grand') {
        const targetNotes = formatTargetVoice(measureData.bassBeats, false);
        const { beats: playedNotes, hasRealNote } = formatPlayedVoice(false, targetNotes);
        const voices = [vf.Voice().setMode(2).addTickables(targetNotes)];
        if (hasRealNote) {
          voices.push(vf.Voice().setMode(2).addTickables(playedNotes));
        }
        const stave = system.addStave({ voices });
        if (m === 0) stave.addClef('bass').addTimeSignature('4/4');
      }
      
      if (staffType === 'grand') {
        if (m === 0) system.addConnector('brace');
        system.addConnector('singleRight');
      }
      
      if (m === 0) {
        system.addConnector('singleLeft');
      }
      
      if (m === measuresPerLine - 1 && staffType !== 'grand') {
        system.addConnector('singleRight');
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
    }
  };

  const onNoteOn = (e) => {
    activeMidiNotes.add(e.note.identifier);
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
    const measureIdx = Math.floor(currentBeatIndex / 4);
    const beatInMeasure = currentBeatIndex % 4;
    const measureData = musicData[measureIdx];
    if (!measureData) return;

    const targetNotes = Array.from(new Set([...measureData.trebleBeats[beatInMeasure], ...measureData.bassBeats[beatInMeasure]]));
    
    // Check if activeMidiNotes exactly match targetNotes
    if (activeMidiNotes.size === targetNotes.length && targetNotes.every(n => activeMidiNotes.has(n))) {
      currentBeatIndex++;
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

// Automatically initialize if we're in a browser environment.
if (typeof document !== 'undefined') {
  const minSelect = document.getElementById('min-note');
  const maxSelect = document.getElementById('max-note');
  if (minSelect && maxSelect) {
    ALL_PIANO_NOTES.forEach(note => {
      const opt1 = document.createElement('option');
      opt1.value = note;
      opt1.textContent = note;
      minSelect.appendChild(opt1);
      
      const opt2 = document.createElement('option');
      opt2.value = note;
      opt2.textContent = note;
      maxSelect.appendChild(opt2);
    });
    minSelect.value = 'C2';
    maxSelect.value = 'C6';
  }

  const selectors = ['measures-per-line', 'notes-per-beat', 'lines', 'staff-type', 'min-note', 'max-note'];
  selectors.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => regenerateAndRender());
  });
  
  regenerateAndRender();
  initMIDI();
}
