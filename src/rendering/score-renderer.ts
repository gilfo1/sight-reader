import { Factory, Accidental, StaveNote, Voice, Stave, Beam, EasyScore, System } from 'vexflow';
import { KEY_SIGNATURES } from '@/constants';
import type { Measure, GeneratorConfig } from '@/engine';

export interface RenderState {
  musicData: Measure[];
  currentStepIndex: number;
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
  score: EasyScore, 
  measureData: Measure, 
  measureIdx: number, 
  isTreble: boolean, 
  currentNotesArray: StaveNote[] | null, 
  currentStepIndex: number, 
  getStepInfo: (index: number) => { measureIdx: number; stepIdx: number } | null
): StaveNote[] {
  if (!measureData) return [];
  const steps = (isTreble ? measureData.trebleSteps : measureData.bassSteps) || [];
  const pattern = measureData.pattern || [];
  const clef = isTreble ? 'treble' : 'bass';
  const stem = isTreble ? 'up' : 'down';

  return steps.map((pitches, bIdx) => {
    const duration = pattern[bIdx] || 'q';
    const info = getStepInfo(currentStepIndex);
    const isCurrent = info?.measureIdx === measureIdx && info?.stepIdx === bIdx;
    
    const restPitch = isTreble ? 'B4' : 'D3';
    const noteStr = (pitches?.length || 0) === 0 
      ? `${restPitch}/${duration}/r` 
      : (pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`);
    
    const note = score.notes(noteStr, { stem, clef })[0] as StaveNote;
    if (isCurrent && currentNotesArray) currentNotesArray.push(note);
    return note;
  });
}

function drawHighlight(f: Factory, currentNotes: StaveNote[]): void {
  if (!currentNotes || !Array.isArray(currentNotes) || currentNotes.length === 0) return;
  const ctx = f.getContext();
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < currentNotes.length; i++) {
    const note = currentNotes[i];
    if (!note || !note.getTickContext()) continue;
    
    const x = note.getAbsoluteX();
    const metrics = note.getMetrics();
    const modLeft = metrics?.modLeftPx || 0;
    const modRight = metrics?.modRightPx || 0;
    const notePx = metrics?.notePx || 12;

    minX = Math.min(minX, x - modLeft - 5);
    maxX = Math.max(maxX, x + notePx + modRight + 5);

    const bb = note.getBoundingBox();
    if (bb) {
      minY = Math.min(minY, bb.getY() - 5);
      maxY = Math.max(maxY, bb.getY() + bb.getH() + 5);
    } else {
      minY = Math.min(minY, 50);
      maxY = Math.max(maxY, 150);
    }
  }

  const y = minY;
  const height = maxY - minY;
  
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

function getVoices(f: Factory, score: EasyScore, measureData: Measure, measureIdx: number, isTreble: boolean, currentNotes: StaveNote[] | null, state: RenderState, selectors: RenderSelectors): Voice[] {
  const { currentStepIndex } = state;
  const { getStepInfo } = selectors;
  const targetNotes: StaveNote[] = getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes, currentStepIndex, getStepInfo);
  if (targetNotes.length === 0) return [];
  
  const v: Voice[] = [f.Voice().setMode(2).addTickables(targetNotes)];
  try {
    Accidental.applyAccidentals(v, getValidKey(measureData.keySignature));
  } catch (e) {
    // Ignore accidental errors in weird environments
  }
  return v;
}

function calculateColumnWidths(
  measuresPerLine: number,
  linesCount: number,
  staffType: string,
  state: RenderState,
  selectors: RenderSelectors
): number[] {
  const { musicData } = state;
  const colWidths: number[] = new Array(measuresPerLine).fill(200);
  const hiddenDiv: HTMLDivElement = document.createElement('div');
  hiddenDiv.id = 'temp-vf-' + Math.random().toString(36).substring(2, 9);
  hiddenDiv.style.display = 'none';
  document.body.appendChild(hiddenDiv);

  const widthCalculator = new Factory({ renderer: { elementId: hiddenDiv.id, width: 5000, height: 5000 } });
  const tempScore = widthCalculator.EasyScore();

  for (let m = 0; m < measuresPerLine; m++) {
    for (let l = 0; l < linesCount; l++) {
      const measureIdx = (l * measuresPerLine) + m;
      const measureData = musicData[measureIdx] || { 
        keySignature: 'C', 
        pattern: [], 
        trebleSteps: [],
        bassSteps: [],
        staffType: 'grand' 
      } as Measure;
      const system: System = widthCalculator.System({ x: 0, y: 0 });
      const keySig = getValidKey(measureData.keySignature);

      if (staffType === 'treble' || staffType === 'grand') {
        const v = getVoices(widthCalculator, tempScore, measureData, measureIdx, true, null, state, selectors);
        configureStave(system.addStave({ voices: v }), true, m, keySig);
      }
      if (staffType === 'bass' || staffType === 'grand') {
        const v = getVoices(widthCalculator, tempScore, measureData, measureIdx, false, null, state, selectors);
        configureStave(system.addStave({ voices: v }), false, m, keySig);
      }
      
      system.format();
      colWidths[m] = Math.max(colWidths[m]!, (system as any).options.width + 30);
      widthCalculator.reset();
      hiddenDiv.innerHTML = '';
    }
  }
  document.body.removeChild(hiddenDiv);
  return colWidths;
}

function addVoicesWithPlayed(
  vf: Factory,
  score: EasyScore,
  measureData: Measure,
  measureIdx: number,
  isTreble: boolean,
  currentNotes: StaveNote[],
  state: RenderState,
  selectors: RenderSelectors,
  allTargetVoices: Voice[]
): Voice[] {
  const { currentStepIndex, activeMidiNotes, suppressedNotes } = state;
  const { getStepInfo } = selectors;
  
  const targetNotes = getTargetNotes(score, measureData, measureIdx, isTreble, currentNotes, currentStepIndex, getStepInfo);
  if (targetNotes.length === 0) return [];
  
  const targetVoice = vf.Voice().setMode(2).addTickables(targetNotes);
  const voices: Voice[] = [targetVoice];
  try {
    Accidental.applyAccidentals(voices, getValidKey(measureData.keySignature));
  } catch (e) {
    // Ignore
  }
  allTargetVoices.push(targetVoice);

  const info = getStepInfo(currentStepIndex);
  if (info && info.measureIdx === measureIdx) {
    const b = info.stepIdx;
    const duration = (measureData.pattern || [])[b] || 'q';
    const steps = isTreble ? (measureData.trebleSteps || []) : (measureData.bassSteps || []);
    const targetPitches = steps[b] || [];
    
    const pitches = Array.from(activeMidiNotes).filter(p => {
      if (suppressedNotes.has(p) && !targetPitches.includes(p)) return false;
      const match = p.match(/(-?\d+)$/);
      const octave = match ? parseInt(match[1]!) : 4;
      return (measureData.staffType || 'grand') === 'grand' ? (isTreble ? octave >= 4 : octave < 4) : true;
    });

    if (pitches.length > 0) {
      const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
      const pNotes = score.notes(noteStr, { stem: isTreble ? 'up' : 'down', clef: isTreble ? 'treble' : 'bass' }) as StaveNote[];
      
      if (pNotes && Array.isArray(pNotes)) {
        for (let i = 0; i < pNotes.length; i++) {
          const note = pNotes[i]!;
          for (let j = 0; j < pitches.length; j++) {
            const p = pitches[j]!;
            if (!targetPitches.includes(p)) {
              note.setKeyStyle(j, { fillStyle: 'rgba(128, 128, 128, 0.4)', strokeStyle: 'rgba(128, 128, 128, 0.4)' });
            }
          }
          const tNote = targetNotes[b];
          if (tNote) {
            const originalDraw = (note.draw as any).bind(note);
            note.draw = function(): void {
              if (tNote.getTickContext() && note.getTickContext()) {
                note.setXShift(tNote.getAbsoluteX() - note.getAbsoluteX());
              }
              originalDraw();
            };
          }
        }
        const pVoice = vf.Voice().setMode(2).addTickables(pNotes);
        (pVoice as any).getWidth = (): number => 0;
        voices.push(pVoice);
      }
    }
  }
  return voices;
}

function drawBeams(vf: Factory, voicesToBeam: Voice[]): void {
  if (!Array.isArray(voicesToBeam)) return;
  for (const v of voicesToBeam) {
    if (!v) continue;
    try {
      const beams = Beam.generateBeams(v.getTickables() as StaveNote[]);
      if (Array.isArray(beams)) {
        for (const b of beams) {
          if (b) b.setContext(vf.getContext()).draw();
        }
      }
    } catch (e) {
      // Ignore
    }
  }
}

export function renderScore(outputDiv: HTMLElement | null = null, config?: Partial<GeneratorConfig>, state?: RenderState, selectors?: RenderSelectors): void {
  const currentNotes: StaveNote[] = [];
  const voicesToBeam: Voice[] = [];
  
  const div = outputDiv || document.getElementById('output');
  if (!div) return;
  
  const measuresPerLine = config?.measuresPerLine || 4;
  const linesCount = config?.linesCount || 1;
  const staffType = config?.staffType || 'grand';
  
  const actualState = state || { musicData: [], currentStepIndex: 0, activeMidiNotes: new Set(), suppressedNotes: new Set() };
  const actualSelectors = selectors || { getStepInfo: () => null };

  const { musicData } = actualState;

  div.innerHTML = '';
  if (!div.id) div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);

  const currentParams = JSON.stringify({ musicData, measuresPerLine, linesCount, staffType });
  if (lastRenderParams !== currentParams) {
    cachedColWidths = calculateColumnWidths(measuresPerLine, linesCount, staffType, actualState, actualSelectors);
    lastRenderParams = currentParams;
  }

  const colWidths = cachedColWidths || new Array(measuresPerLine).fill(150);
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + 100;
  const heightPerLine = staffType === 'grand' ? 250 : 150;
  const totalHeight = (linesCount * heightPerLine) + 100;

  const vf = new Factory({ renderer: { elementId: div.id, width: totalWidth, height: totalHeight } });
  const score = vf.EasyScore();

  for (let l = 0; l < linesCount; l++) {
    const y = 50 + (l * heightPerLine);
    let currentX = 50;
    
    for (let m = 0; m < measuresPerLine; m++) {
      const measureIdx = (l * measuresPerLine) + m;
      const measureData = musicData[measureIdx] || { 
        keySignature: 'C', 
        pattern: [], 
        trebleSteps: [],
        bassSteps: [],
        staffType: 'grand' 
      } as Measure;
      const width = colWidths[m]!;
      const x = currentX;
      currentX += width;

      const system: System = vf.System({ x, y, width });
      const keySig = getValidKey(measureData.keySignature);
      
      const renderClef = (isTreble: boolean): void => {
        const v = addVoicesWithPlayed(vf, score, measureData, measureIdx, isTreble, currentNotes, actualState, actualSelectors, voicesToBeam);
        configureStave(system.addStave({ voices: v }), isTreble, m, keySig);
      };

      if (staffType === 'treble' || staffType === 'grand') renderClef(true);
      if (staffType === 'bass' || staffType === 'grand') renderClef(false);

      if (m === 0) {
        if (staffType === 'grand') system.addConnector('brace');
        system.addConnector('singleLeft');
      }
      system.addConnector('singleRight');
      if (measureIdx === musicData.length - 1) system.addConnector('boldDoubleRight');
      system.format();
    }
  }
  vf.draw();
  drawBeams(vf, voicesToBeam);
  drawHighlight(vf, currentNotes);
}
