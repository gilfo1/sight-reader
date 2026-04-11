import { Factory, StaveNote, Voice } from 'vexflow';
import type { GeneratorConfig } from '@/engine';
import {
  addVoicesWithPlayed,
  configureStave,
  createRendererElementId,
  drawBeams,
  drawHighlight,
  getMeasureOrDefault,
  getValidKey,
  getVoices,
} from '@/rendering/score-renderer-helpers';
import { DEFAULT_RENDER_STATE, type RenderSelectors, type RenderState } from '@/rendering/score-renderer-types';

let lastRenderParams: string | null = null;
let cachedColWidths: number[] | null = null;

export function clearRenderCache(): void {
  lastRenderParams = null;
  cachedColWidths = null;
}

function calculateColumnWidths(
  measuresPerLine: number,
  linesCount: number,
  staffType: string,
  state: RenderState,
  selectors: RenderSelectors
): number[] {
  const { musicData } = state;
  const colWidths: number[] = new Array(measuresPerLine).fill(150);
  const hiddenDiv: HTMLDivElement = document.createElement('div');
  hiddenDiv.id = createRendererElementId('temp-vf');
  hiddenDiv.style.display = 'none';
  document.body.appendChild(hiddenDiv);

  const widthCalculator = new Factory({ renderer: { elementId: hiddenDiv.id, width: 5000, height: 5000 } });
  const tempScore = widthCalculator.EasyScore();

  for (let m = 0; m < measuresPerLine; m++) {
    for (let l = 0; l < linesCount; l++) {
      const measureIdx = (l * measuresPerLine) + m;
      const measureData = getMeasureOrDefault(musicData, measureIdx);
      const system = widthCalculator.System({ x: 0, y: 0, width: 200 });
      const systemObj = system as any;
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
      
      // Get the width of the staves to account for clef, key signature, etc.
      // In VexFlow 5 Factory.System, we might need to access internal staves differently
      const staves = systemObj.partStaves || systemObj.staves || systemObj.staveList || [];
      let maxWidth = 0;
      for (const s of staves) {
        const stave = s.stave || s; 
        if (!stave || typeof stave.getNoteStartX !== 'function') {
           continue;
        }
        // In JSDOM/Headless, getNoteStartX might not return accurate values if fonts are not loaded.
        // We ensure a minimum width for modifiers in the first measure.
        const modifiersWidth = Math.max(stave.getNoteStartX() - stave.getX(), (m === 0) ? 70 : 0);
        
        let formatterWidth = 0;
        try {
          formatterWidth = systemObj.formatter?.getMinTotalWidth() || 0;
        } catch (e) {
          // In some test environments, getMinTotalWidth might throw if formatting didn't complete.
          // Fallback to a density-based estimation.
          const noteCount = Math.max(measureData.trebleSteps.length, measureData.bassSteps.length);
          formatterWidth = Math.max(100, noteCount * 20);
        }
        
        // Add padding: more padding for the first measure to account for modifiers
        // For measures with many notes (e.g. sixteenths), add extra padding for readability
        const noteCount = Math.max(measureData.trebleSteps.length, measureData.bassSteps.length);
        const densityPadding = Math.max(0, (noteCount - 4) * 12);
        const padding = ((m === 0) ? 80 : 40) + densityPadding;
        const totalMeasureWidth = modifiersWidth + formatterWidth + padding;
        
        maxWidth = Math.max(maxWidth, totalMeasureWidth);
      }

      if (staves.length === 0) {
        // Fallback if we can't find staves (e.g. VexFlow 5 internals change)
        maxWidth = (m === 0) ? 250 : 150;
      }

      colWidths[m] = Math.max(colWidths[m]!, maxWidth);
      widthCalculator.reset();
      hiddenDiv.innerHTML = '';
    }
  }
  document.body.removeChild(hiddenDiv);
  return colWidths;
}

export function renderScore(outputDiv: HTMLElement | null = null, config?: Partial<GeneratorConfig>, state?: RenderState, selectors?: RenderSelectors): number {
  const currentNotes: StaveNote[] = [];
  const voicesToBeam: Voice[] = [];
  
  const div = outputDiv || document.getElementById('output');
  if (!div) return;
  
  const baseMeasuresPerLine = config?.measuresPerLine || 4;
  const baseLinesCount = config?.linesCount || 1;
  const staffType = config?.staffType || 'grand';
  
  const actualState = state ?? DEFAULT_RENDER_STATE;
  const actualSelectors = selectors ?? { getStepInfo: () => null };

  const { musicData } = actualState;

  div.innerHTML = '';
  if (!div.id) div.id = createRendererElementId('vexflow-output');

  const currentParams = JSON.stringify({ musicData, measuresPerLine: baseMeasuresPerLine, linesCount: baseLinesCount, staffType });
  if (lastRenderParams !== currentParams) {
    cachedColWidths = calculateColumnWidths(baseMeasuresPerLine, baseLinesCount, staffType, actualState, actualSelectors);
    lastRenderParams = currentParams;
  }

  const baseColWidths = cachedColWidths || new Array(baseMeasuresPerLine).fill(150);
  
  // Responsive logic
  const availableWidth = div.clientWidth || window.innerWidth;
  const padding = 100; // Total horizontal padding
  const effectiveWidth = availableWidth - padding;
  
  let measuresPerLine = 0;
  let currentWidth = 0;
  for (let i = 0; i < baseMeasuresPerLine; i++) {
    const w = baseColWidths[i] || 150;
    if (measuresPerLine > 0 && currentWidth + w > effectiveWidth + 50) { // Add small buffer
      break;
    }
    currentWidth += w;
    measuresPerLine++;
  }
  
  if (measuresPerLine < 1) measuresPerLine = 1;
  
  const isResponsiveOverride = measuresPerLine < baseMeasuresPerLine;
  const linesCount = isResponsiveOverride ? 1 : baseLinesCount;

  const renderedMeasuresCount = linesCount * measuresPerLine;
  const colWidths = baseColWidths.slice(0, measuresPerLine);
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
      const measureData = getMeasureOrDefault(musicData, measureIdx);
      const width = colWidths[m]!;
      const x = currentX;
      currentX += width;

      const system = vf.System({ x, y, width });
      const keySig = getValidKey(measureData.keySignature);
      
      const renderClef = (isTreble: boolean): void => {
        const v = addVoicesWithPlayed(vf, score, measureData, measureIdx, isTreble, currentNotes, actualState, actualSelectors, voicesToBeam);
        const stave = system.addStave({ voices: v });
        configureStave(stave, isTreble, m, keySig);
      };

      if (staffType === 'treble' || staffType === 'grand') renderClef(true);
      if (staffType === 'bass' || staffType === 'grand') renderClef(false);

      if (m === 0) {
        if (staffType === 'grand') system.addConnector('brace');
        system.addConnector('singleLeft');
      }
      system.addConnector('singleRight');
      
      // Ensure the last rendered measure has the double ending bar
      if (measureIdx === renderedMeasuresCount - 1 || measureIdx === musicData.length - 1) {
        system.addConnector('boldDoubleRight');
      }
      
      system.format();
    }
  }
  // Process beams before draw so flags are suppressed.
  drawBeams(vf, voicesToBeam);
  vf.draw();
  drawHighlight(vf, currentNotes);
  return renderedMeasuresCount;
}
