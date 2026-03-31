import { Factory, Accidental, StaveNote, Voice, Stave, Beam } from 'vexflow';
import { KEY_SIGNATURES } from '../constants/music';
import { Measure } from '../engine/state';
import { AppConfig } from '../engine/generator';

export interface RenderState {
  musicData: Measure[];
  currentBeatIndex: number;
  activeMidiNotes: Set<string>;
  suppressedNotes: Set<string>;
}

export interface RenderSelectors {
  getStepInfo: (index: number) => { measureIdx: number; stepIdx: number } | null;
}

let lastRenderParams: string | null = null;
let cachedColWidths: number[] | null = null;

export function clearRenderCache(): void {
  lastRenderParams = null;
  cachedColWidths = null;
}

function getTargetNotes(
  score: any, 
  measureData: Measure, 
  measureIdx: number, 
  isTreble: boolean, 
  currentNotesArray: StaveNote[] | null, 
  currentBeatIndex: number, 
  getStepInfo: (index: number) => { measureIdx: number; stepIdx: number } | null
): StaveNote[] {
  if (!measureData) return [];
  const beats = isTreble ? (measureData.trebleBeats || []) : (measureData.bassBeats || []);
  const pattern = measureData.pattern || beats.map(() => 'q');
  const clef = isTreble ? 'treble' : 'bass';
  const stem = isTreble ? 'up' : 'down';

  return beats.map((pitches, bIdx) => {
    const duration = pattern[bIdx] || 'q';
    const info = (typeof getStepInfo === 'function') ? getStepInfo(currentBeatIndex) : null;
    const isCurrent = (info && info.measureIdx === measureIdx && info.stepIdx === bIdx);
    
    let note: StaveNote;
    if (pitches.length === 0) {
      const restPitch = isTreble ? 'B4' : 'D3';
      note = score.notes(`${restPitch}/${duration}/r`, { clef })[0] as StaveNote;
    } else {
      const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
      note = score.notes(noteStr, { stem, clef })[0] as StaveNote;
    }
    
    if (isCurrent && currentNotesArray) currentNotesArray.push(note);
    return note;
  });
}

function drawHighlight(f: Factory, currentNotes: StaveNote[]): void {
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

function getValidKey(key?: string): string {
  return (key && KEY_SIGNATURES.includes(key)) ? key : 'C';
}

function configureStave(stave: Stave, isTreble: boolean, m: number, keySig: string): void {
  if (m === 0) {
    stave.addClef(isTreble ? 'treble' : 'bass').addTimeSignature('4/4');
    if (keySig !== 'C') stave.addKeySignature(keySig);
  }
}

function getVoices(f: Factory, score: any, measureData: Measure, measureIdx: number, isTreble: boolean, currentNotes: StaveNote[] | null, state: RenderState, selectors: RenderSelectors): Voice[] {
  const { currentBeatIndex } = state;
  const { getStepInfo } = selectors;
  const targetNotes: StaveNote[] = getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes, currentBeatIndex, getStepInfo);
  if (targetNotes.length === 0) return [];
  
  const v: Voice[] = [f.Voice().setMode(2).addTickables(targetNotes)];
  Accidental.applyAccidentals(v, getValidKey(measureData.keySignature));
  return v;
}

export function renderStaff(outputDiv: HTMLElement | null = null, config?: AppConfig, state?: RenderState, selectors?: RenderSelectors): void {
  const div: HTMLElement | null = outputDiv || document.getElementById('output');
  if (!div) return;
  
  const measuresPerLine: number = config?.measuresPerLine || 4;
  const linesCount: number = config?.linesCount || 1;
  const staffType: string = config?.staffType || 'grand';
  
  if (!state) {
    state = { musicData: [], currentBeatIndex: 0, activeMidiNotes: new Set(), suppressedNotes: new Set() };
  }
  if (!selectors) {
    selectors = { getStepInfo: (_i: number) => null };
  }

  const { musicData, currentBeatIndex, activeMidiNotes, suppressedNotes } = state;
  const { getStepInfo } = selectors;

  div.innerHTML = '';
  if (!div.id) {
    div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);
  }

  const currentParams: string = JSON.stringify({ musicData, measuresPerLine, linesCount, staffType });
  if (lastRenderParams !== currentParams) {
    const colWidths: number[] = new Array(measuresPerLine).fill(150);
    const hiddenDiv: HTMLDivElement = document.createElement('div');
    hiddenDiv.id = 'temp-vf-' + Math.random().toString(36).substring(2, 9);
    hiddenDiv.style.display = 'none';
    document.body.appendChild(hiddenDiv);

    const tempVf: Factory = new Factory({ renderer: { elementId: hiddenDiv.id, width: 5000, height: 5000 } });
    const tempScore: any = (tempVf as any).EasyScore();

    for (let m = 0; m < measuresPerLine; m++) {
      for (let l = 0; l < linesCount; l++) {
        const measureIdx: number = (l * measuresPerLine) + m;
        const measureData: Measure = musicData[measureIdx] || { keySignature: 'C' };
        const system: any = (tempVf as any).System({ x: 0, y: 0 });
        const keySig: string = getValidKey(measureData.keySignature);

        if (staffType === 'treble' || staffType === 'grand') {
          const v: Voice[] = getVoices(tempVf, tempScore, measureData, measureIdx, true, null, state, selectors);
          configureStave(system.addStave({ voices: v }), true, m, keySig);
        }
        if (staffType === 'bass' || staffType === 'grand') {
          const v: Voice[] = getVoices(tempVf, tempScore, measureData, measureIdx, false, null, state, selectors);
          configureStave(system.addStave({ voices: v }), false, m, keySig);
        }
        
        system.format();
        colWidths[m] = Math.max(colWidths[m]!, (system as any).options.width);
        tempVf.reset();
        hiddenDiv.innerHTML = '';
      }
    }
    document.body.removeChild(hiddenDiv);
    cachedColWidths = colWidths;
    lastRenderParams = currentParams;
  }

  const colWidths: number[] = cachedColWidths || new Array(measuresPerLine).fill(150);
  const totalWidth: number = colWidths.reduce((a: number, b: number) => a + b, 0) + 100;
  const heightPerLine: number = staffType === 'grand' ? 250 : 150;
  const totalHeight: number = (linesCount * heightPerLine) + 100;

  const vf: Factory = new Factory({ renderer: { elementId: div.id, width: totalWidth, height: totalHeight } });
  const score: any = (vf as any).EasyScore();
  const currentNotes: StaveNote[] = [];
  const allTargetVoices: Voice[] = [];

  for (let l = 0; l < linesCount; l++) {
    const y: number = 50 + (l * heightPerLine);
    let currentX: number = 50;
    
    for (let m = 0; m < measuresPerLine; m++) {
      const measureIdx: number = (l * measuresPerLine) + m;
      const measureData: Measure = musicData[measureIdx] || { keySignature: 'C' };
      const keySig: string = getValidKey(measureData.keySignature);
      const width: number = colWidths[m]!;
      const x: number = currentX;
      currentX += width;

      const system: any = (vf as any).System({ x, y, width });
      
      const addVoicesWithPlayed = (isTreble: boolean): Voice[] => {
        const targetNotes: StaveNote[] = getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes, currentBeatIndex, getStepInfo);
        if (targetNotes.length === 0) return [];
        
        const targetVoice: Voice = vf.Voice().setMode(2).addTickables(targetNotes);
        const voices: Voice[] = [targetVoice];
        Accidental.applyAccidentals(voices, keySig);
        allTargetVoices.push(targetVoice);

        const info = getStepInfo(currentBeatIndex);
        if (info && info.measureIdx === measureIdx) {
          const b: number = info.stepIdx;
          const duration: string = (measureData.pattern || [])[b] || 'q';
          const beats: string[][] = isTreble ? (measureData.trebleBeats || []) : (measureData.bassBeats || []);
          const targetPitches: string[] = beats[b] || [];
          
          const pitches: string[] = Array.from(activeMidiNotes as Set<string>).filter(p => {
            if (suppressedNotes.has(p) && !targetPitches.includes(p)) return false;
            const match = p.match(/(-?\d+)$/);
            const octave: number = match ? parseInt(match[1]!) : 4;
            return staffType === 'grand' ? (isTreble ? octave >= 4 : octave < 4) : true;
          });

          if (pitches.length > 0) {
            const noteStr: string = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
            const pNotes: StaveNote[] = score.notes(noteStr, { stem: isTreble ? 'up' : 'down', clef: isTreble ? 'treble' : 'bass' }) as StaveNote[];
            
            pNotes.forEach(note => {
              pitches.forEach((p, idx) => {
                if (!targetPitches.includes(p)) {
                  note.setKeyStyle(idx, { fillStyle: 'rgba(128, 128, 128, 0.4)', strokeStyle: 'rgba(128, 128, 128, 0.4)' });
                }
              });
              const tNote: StaveNote = targetNotes[b]!;
              if (tNote) {
                const originalDraw: () => void = (note.draw as any).bind(note);
                note.draw = function(): void {
                  if (tNote.getTickContext() && note.getTickContext()) {
                    note.setXShift(tNote.getAbsoluteX() - note.getAbsoluteX());
                  }
                  originalDraw();
                };
              }
            });
            const pVoice: Voice = vf.Voice().setMode(2).addTickables(pNotes);
            (pVoice as any).getWidth = (): number => 0;
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
    Beam.generateBeams(voice.getTickables() as any).forEach(b => b.setContext(vf.getContext()).draw());
  });

  drawHighlight(vf, currentNotes);
}
