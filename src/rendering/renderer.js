import { Factory, Accidental, Beam } from 'vexflow';
import { KEY_SIGNATURES } from '../constants/music.js';

let lastRenderParams = null;
let cachedColWidths = null;

export function clearRenderCache() {
  lastRenderParams = null;
  cachedColWidths = null;
}

function getTargetNotes(score, measureData, measureIdx, isTreble, currentNotesArray, currentBeatIndex, getStepInfo) {
  if (!measureData) return [];
  const beats = isTreble ? (measureData.trebleBeats || []) : (measureData.bassBeats || []);
  const pattern = measureData.pattern || beats.map(() => 'q');
  const clef = isTreble ? 'treble' : 'bass';
  const stem = isTreble ? 'up' : 'down';

  return beats.map((pitches, bIdx) => {
    const duration = pattern[bIdx] || 'q';
    const info = (typeof getStepInfo === 'function') ? getStepInfo(currentBeatIndex) : null;
    const isCurrent = (info && info.measureIdx === measureIdx && info.stepIdx === bIdx);
    
    let note;
    if (pitches.length === 0) {
      const restPitch = isTreble ? 'B4' : 'D3';
      note = score.notes(`${restPitch}/${duration}/r`, { clef })[0];
    } else {
      const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
      note = score.notes(noteStr, { stem, clef })[0];
    }
    
    if (isCurrent && currentNotesArray) currentNotesArray.push(note);
    return note;
  });
}

function drawHighlight(f, currentNotes) {
  if (currentNotes.length === 0) return;
  const ctx = f.getContext();
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  currentNotes.forEach(note => {
     if (!note.getTickContext()) return;
     const x = note.getAbsoluteX();
     minX = Math.min(minX, x - 15);
     maxX = Math.max(maxX, x + 35);
     
     const bb = note.getBoundingBox();
     if (bb) {
       minY = Math.min(minY, bb.getY());
       maxY = Math.max(maxY, bb.getY() + bb.getH());
     }
  });

  const y = minY - 20;
  const height = (maxY - minY) + 40;
  
  ctx.save();
  ctx.setFillStyle('rgba(173, 216, 230, 0.4)');
  ctx.fillRect(minX, y, maxX - minX, height);
  ctx.restore();
}

function getValidKey(key) {
  return KEY_SIGNATURES.includes(key) ? key : 'C';
}

function configureStave(stave, isTreble, m, keySig) {
  if (m === 0) {
    stave.addClef(isTreble ? 'treble' : 'bass').addTimeSignature('4/4');
    if (keySig !== 'C') stave.addKeySignature(keySig);
  }
}

function getVoices(f, score, measureData, measureIdx, isTreble, currentNotes, state, selectors) {
  const { currentBeatIndex } = state;
  const { getStepInfo } = selectors;
  const targetNotes = getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes, currentBeatIndex, getStepInfo);
  if (targetNotes.length === 0) return [];
  
  const v = [f.Voice().setMode(2).addTickables(targetNotes)];
  Accidental.applyAccidentals(v, getValidKey(measureData.keySignature));
  return v;
}

export function renderStaff(outputDiv, config, state, selectors) {
  const div = outputDiv || document.getElementById('output');
  if (!div) return;
  
  const measuresPerLine = config?.measuresPerLine || 4;
  const linesCount = config?.linesCount || 1;
  const staffType = config?.staffType || 'grand';
  
  if (!state) {
    state = { musicData: [], currentBeatIndex: 0, activeMidiNotes: new Set(), suppressedNotes: new Set() };
  }
  if (!selectors) {
    selectors = { getStepInfo: (i) => null };
  }

  const { musicData, currentBeatIndex, activeMidiNotes, suppressedNotes } = state;
  const { getStepInfo } = selectors;

  div.innerHTML = '';
  if (!div.id) {
    div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);
  }

  const currentParams = JSON.stringify({ musicData, measuresPerLine, linesCount, staffType });
  if (lastRenderParams !== currentParams) {
    const colWidths = new Array(measuresPerLine).fill(150);
    const hiddenDiv = document.createElement('div');
    hiddenDiv.id = 'temp-vf-' + Math.random().toString(36).substring(2, 9);
    hiddenDiv.style.display = 'none';
    document.body.appendChild(hiddenDiv);

    const tempVf = new Factory({ renderer: { elementId: hiddenDiv.id, width: 5000, height: 5000 } });
    const tempScore = tempVf.EasyScore();

    for (let m = 0; m < measuresPerLine; m++) {
      for (let l = 0; l < linesCount; l++) {
        const measureIdx = (l * measuresPerLine) + m;
        const measureData = musicData[measureIdx] || { keySignature: 'C' };
        const system = tempVf.System({ x: 0, y: 0 });
        const keySig = getValidKey(measureData.keySignature);

        if (staffType === 'treble' || staffType === 'grand') {
          const v = getVoices(tempVf, tempScore, measureData, measureIdx, true, null, state, selectors);
          configureStave(system.addStave({ voices: v }), true, m, keySig);
        }
        if (staffType === 'bass' || staffType === 'grand') {
          const v = getVoices(tempVf, tempScore, measureData, measureIdx, false, null, state, selectors);
          configureStave(system.addStave({ voices: v }), false, m, keySig);
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

  const colWidths = cachedColWidths || new Array(measuresPerLine).fill(150);
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + 100;
  const heightPerLine = staffType === 'grand' ? 250 : 150;
  const totalHeight = (linesCount * heightPerLine) + 100;

  const vf = new Factory({ renderer: { elementId: div.id, width: totalWidth, height: totalHeight } });
  const score = vf.EasyScore();
  const currentNotes = [];
  const allTargetVoices = [];

  for (let l = 0; l < linesCount; l++) {
    const y = 50 + (l * heightPerLine);
    let currentX = 50;
    
    for (let m = 0; m < measuresPerLine; m++) {
      const measureIdx = (l * measuresPerLine) + m;
      const measureData = musicData[measureIdx] || { keySignature: 'C' };
      const keySig = getValidKey(measureData.keySignature);
      const width = colWidths[m];
      const x = currentX;
      currentX += width;

      const system = vf.System({ x, y, width });
      
      const addVoicesWithPlayed = (isTreble) => {
        const targetNotes = getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes, currentBeatIndex, getStepInfo);
        if (targetNotes.length === 0) return [];
        
        const targetVoice = vf.Voice().setMode(2).addTickables(targetNotes);
        const voices = [targetVoice];
        Accidental.applyAccidentals(voices, keySig);
        allTargetVoices.push(targetVoice);

        const info = getStepInfo(currentBeatIndex);
        if (info && info.measureIdx === measureIdx) {
          const b = info.stepIdx;
          const duration = (measureData.pattern || [])[b] || 'q';
          const targetPitches = isTreble ? (measureData.trebleBeats[b] || []) : (measureData.bassBeats[b] || []);
          
          const pitches = Array.from(activeMidiNotes).filter(p => {
            if (suppressedNotes.has(p) && !targetPitches.includes(p)) return false;
            const octave = parseInt(p.slice(-1));
            return staffType === 'grand' ? (isTreble ? octave >= 4 : octave < 4) : true;
          });

          if (pitches.length > 0) {
            const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
            const pNotes = score.notes(noteStr, { stem: isTreble ? 'up' : 'down', clef: isTreble ? 'treble' : 'bass' });
            
            pNotes.forEach(note => {
              pitches.forEach((p, idx) => {
                if (!targetPitches.includes(p)) {
                  note.setKeyStyle(idx, { fillStyle: 'rgba(128, 128, 128, 0.4)', strokeStyle: 'rgba(128, 128, 128, 0.4)' });
                }
              });
              const tNote = targetNotes[b];
              if (tNote) {
                const originalDraw = note.draw.bind(note);
                note.draw = function() {
                  if (tNote.getTickContext() && note.getTickContext()) {
                    note.setXShift(tNote.getAbsoluteX() - note.getAbsoluteX());
                  }
                  originalDraw();
                };
              }
            });
            const pVoice = vf.Voice().setMode(2).addTickables(pNotes);
            pVoice.getWidth = () => 0;
            voices.push(pVoice);
          }
        }
        return voices;
      };

      if (staffType === 'grand') {
        configureStave(system.addStave({ voices: addVoicesWithPlayed(true) }), true, m, keySig);
        configureStave(system.addStave({ voices: addVoicesWithPlayed(false) }), false, m, keySig);
        if (m === 0) system.addConnector('brace');
        system.addConnector('singleRight');
      } else {
        const isTreble = staffType === 'treble';
        configureStave(system.addStave({ voices: addVoicesWithPlayed(isTreble) }), isTreble, m, keySig);
      }
      
      if (measureIdx === musicData.length - 1) system.addConnector('boldDoubleRight');
    }
  }
  vf.draw();
  
  allTargetVoices.forEach(voice => {
    Beam.generateBeams(voice.getTickables()).forEach(b => b.setContext(vf.getContext()).draw());
  });

  drawHighlight(vf, currentNotes);
}
