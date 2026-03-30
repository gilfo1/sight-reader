import { Factory, Accidental, Beam } from 'vexflow';

let lastRenderParams = null;
let cachedColWidths = null;

export function clearRenderCache() {
  lastRenderParams = null;
  cachedColWidths = null;
}

export function getTargetNotes(score, measureData, measureIdx, isTreble, currentNotesArray, currentBeatIndex, getStepInfo) {
    if (!measureData) return [];
    
    // Support legacy steps structure
    let beats, pattern;
    if (measureData.steps) {
      beats = measureData.steps.map(s => (isTreble ? s.treblePitches : s.bassPitches) || []);
      pattern = measureData.steps.map(s => s.duration || 'q');
    } else {
      beats = isTreble ? (measureData.trebleBeats || []) : (measureData.bassBeats || []);
      pattern = measureData.pattern || beats.map(() => 'q');
    }

    return beats.map((pitches, bIdx) => {
      const duration = pattern[bIdx] || 'q';
      const info = (typeof getStepInfo === 'function') ? getStepInfo(currentBeatIndex) : null;
      const isCurrent = (info && info.measureIdx === measureIdx && info.stepIdx === bIdx);
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
}

export function drawHighlight(f, currentNotes) {
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
            
            // Support legacy steps structure
            let duration, targetPitches;
            if (measureData.steps && measureData.steps[b]) {
              duration = measureData.steps[b].duration || 'q';
              targetPitches = isTreble ? (measureData.steps[b].treblePitches || []) : (measureData.steps[b].bassPitches || []);
            } else if (measureData.pattern && measureData.pattern[b]) {
              duration = measureData.pattern[b];
              targetPitches = isTreble ? (measureData.trebleBeats[b] || []) : (measureData.bassBeats[b] || []);
            } else {
              // Fallback
              duration = 'q';
              targetPitches = [];
            }
            
            const pitches = Array.from(activeMidiNotes).filter(p => {
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
                          const targetX = targetNote.getAbsoluteX();
                          const currentXPos = note.getAbsoluteX();
                          note.setXShift(targetX - currentXPos);
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

      if (staffType === 'grand') {
        const tNotes = formatTargetVoice(true);
        const bNotes = formatTargetVoice(false);
        const pmVoiceT = formatPlayedVoice(true, tNotes);
        const pmVoiceB = formatPlayedVoice(false, bNotes);

        const vT = [];
        if (tNotes.length > 0) {
          const v = vf.Voice().setMode(2).addTickables(tNotes);
          vT.push(v);
          Accidental.applyAccidentals(vT, measureData.keySignature || 'C');
          allTargetVoices.push(v);
        }
        if (pmVoiceT) vT.push(pmVoiceT);

        const vB = [];
        if (bNotes.length > 0) {
          const v = vf.Voice().setMode(2).addTickables(bNotes);
          vB.push(v);
          Accidental.applyAccidentals(vB, measureData.keySignature || 'C');
          allTargetVoices.push(v);
        }
        if (pmVoiceB) vB.push(pmVoiceB);

        const st = system.addStave({ voices: vT });
        const sb = system.addStave({ voices: vB });

        if (m === 0) {
          if (measureData.keySignature) {
            st.addClef('treble').addKeySignature(measureData.keySignature);
            sb.addClef('bass').addKeySignature(measureData.keySignature);
          } else {
            st.addClef('treble');
            sb.addClef('bass');
          }
          system.addConnector('brace');
        }
        system.addConnector('singleRight');
        if (measureIdx === musicData.length - 1) {
            system.addConnector('boldDoubleRight');
        }
      } else {
        const isTreble = staffType === 'treble';
        const notes = formatTargetVoice(isTreble);
        const pmVoice = formatPlayedVoice(isTreble, notes);
        const voices = [];
        if (notes.length > 0) {
          const v = vf.Voice().setMode(2).addTickables(notes);
          voices.push(v);
          Accidental.applyAccidentals(voices, measureData.keySignature || 'C');
          allTargetVoices.push(v);
        }
        if (pmVoice) voices.push(pmVoice);
        
        const stave = system.addStave({ voices });

        if (m === 0) {
          stave.addClef(isTreble ? 'treble' : 'bass');
          if (measureData.keySignature) {
            stave.addKeySignature(measureData.keySignature);
          }
        }
        if (measureIdx === musicData.length - 1) {
            system.addConnector('boldDoubleRight');
        }
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
