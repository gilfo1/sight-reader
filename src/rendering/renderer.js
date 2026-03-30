import { Factory, Accidental, Beam } from 'vexflow';

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

export function renderStaff(outputDiv, config, state, selectors) {
  const div = outputDiv || document.getElementById('output');
  if (!div) return;
  
  // Use provided config or default to standard settings
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
        const measureData = musicData[measureIdx] || { trebleBeats: [], bassBeats: [], pattern: [], keySignature: 'C' };

        const system = tempVf.System({ x: 0, y: 0 });
        
        if (staffType === 'treble' || staffType === 'grand') {
          const targetNotes = getTargetNotes(tempScore, measureData, measureIdx, true, null, currentBeatIndex, getStepInfo);
          const v = [];
          if (targetNotes.length > 0) {
            const voice = tempVf.Voice().setMode(2).addTickables(targetNotes);
            v.push(voice);
            Accidental.applyAccidentals(v, measureData.keySignature || 'C');
          }
          const stave = system.addStave({ voices: v });
          if (m === 0) {
            stave.addClef('treble').addTimeSignature('4/4');
            if (measureData.keySignature && measureData.keySignature !== 'C') {
              stave.addKeySignature(measureData.keySignature);
            }
          }
        }
        if (staffType === 'bass' || staffType === 'grand') {
          const targetNotes = getTargetNotes(tempScore, measureData, measureIdx, false, null, currentBeatIndex, getStepInfo);
          const v = [];
          if (targetNotes.length > 0) {
            const voice = tempVf.Voice().setMode(2).addTickables(targetNotes);
            v.push(voice);
            Accidental.applyAccidentals(v, measureData.keySignature || 'C');
          }
          const stave = system.addStave({ voices: v });
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

  const colWidths = cachedColWidths || new Array(measuresPerLine).fill(150);
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
  const allTargetVoices = [];

  for (let l = 0; l < linesCount; l++) {
    const y = 50 + (l * heightPerLine);
    let currentX = 50;
    
    for (let m = 0; m < measuresPerLine; m++) {
      const measureIdx = (l * measuresPerLine) + m;
      const measureData = musicData[measureIdx] || { trebleBeats: [], bassBeats: [], pattern: [], keySignature: 'C' };

      const width = colWidths[m];
      const x = currentX;
      currentX += width;

      const system = vf.System({ x, y, width });
      
      const formatTargetVoice = (isTreble) => {
        return getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes, currentBeatIndex, getStepInfo);
      };

      const formatPlayedVoice = (isTreble, targetNotesForStave) => {
        const info = getStepInfo(currentBeatIndex);
        if (info && info.measureIdx === measureIdx) {
            const b = info.stepIdx;
            const duration = (measureData.pattern || [])[b] || 'q';
            const targetPitches = isTreble ? (measureData.trebleBeats[b] || []) : (measureData.bassBeats[b] || []);
            
            const pitches = Array.from(activeMidiNotes).filter(p => {
              if (suppressedNotes.has(p) && !targetPitches.includes(p)) return false;
              const octave = parseInt(p.slice(-1));
              if (staffType === 'treble') return isTreble;
              if (staffType === 'bass') return !isTreble;
              return isTreble ? octave >= 4 : octave < 4;
            });

            if (pitches.length > 0) {
              const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
              const notes = score.notes(noteStr, { 
                stem: isTreble ? 'up' : 'down',
                clef: isTreble ? 'treble' : 'bass'
              });
              
              notes.forEach(note => {
                  pitches.forEach((p, idx) => {
                      if (!targetPitches.includes(p)) {
                          note.setKeyStyle(idx, { fillStyle: 'rgba(128, 128, 128, 0.4)', strokeStyle: 'rgba(128, 128, 128, 0.4)' });
                      }
                  });
                  const targetNote = targetNotesForStave[b];
                  if (targetNote) {
                    const originalDraw = note.draw.bind(note);
                    note.draw = function() {
                        if (targetNote.getTickContext() && note.getTickContext()) {
                          note.setXShift(targetNote.getAbsoluteX() - note.getAbsoluteX());
                        }
                        originalDraw();
                    };
                  }
              });
              const voice = vf.Voice().setMode(2).addTickables(notes);
              voice.getWidth = () => 0;
              return voice;
            }
        }
        return null;
      };

      const addVoicesToStave = (isTreble, targetNotes) => {
        const v = [];
        if (targetNotes.length > 0) {
          const voice = vf.Voice().setMode(2).addTickables(targetNotes);
          v.push(voice);
          Accidental.applyAccidentals(v, measureData.keySignature || 'C');
          allTargetVoices.push(voice);
        }
        const pmVoice = formatPlayedVoice(isTreble, targetNotes);
        if (pmVoice) v.push(pmVoice);
        return v;
      };

      if (staffType === 'grand') {
        const tNotes = formatTargetVoice(true);
        const bNotes = formatTargetVoice(false);
        const st = system.addStave({ voices: addVoicesToStave(true, tNotes) });
        const sb = system.addStave({ voices: addVoicesToStave(false, bNotes) });

        if (m === 0) {
          st.addClef('treble');
          sb.addClef('bass');
          if (measureData.keySignature && measureData.keySignature !== 'C') {
            st.addKeySignature(measureData.keySignature);
            sb.addKeySignature(measureData.keySignature);
          }
          system.addConnector('brace');
        }
        system.addConnector('singleRight');
      } else {
        const isTreble = staffType === 'treble';
        const notes = formatTargetVoice(isTreble);
        const stave = system.addStave({ voices: addVoicesToStave(isTreble, notes) });
        if (m === 0) {
          stave.addClef(isTreble ? 'treble' : 'bass');
          if (measureData.keySignature && measureData.keySignature !== 'C') {
            stave.addKeySignature(measureData.keySignature);
          }
        }
      }
      
      if (measureIdx === musicData.length - 1) {
          system.addConnector('boldDoubleRight');
      }
    }
  }
  vf.draw();
  
  // Render beams AFTER vf.draw() because it clears the renderer element
  allTargetVoices.forEach(voice => {
    const beams = Beam.generateBeams(voice.getTickables());
    beams.forEach(b => {
      b.setContext(vf.getContext()).draw();
    });
  });

  drawHighlight(vf, currentNotes);
}
