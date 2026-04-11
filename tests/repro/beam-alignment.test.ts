import { describe, it, expect, beforeEach } from 'vitest';
import { renderScore, RenderState, RenderSelectors } from '@/rendering/score-renderer';
import { Measure } from '@/engine';

describe('Music Notation - Beams and Stems Alignment', () => {
  let outputDiv: HTMLDivElement;

  beforeEach(() => {
    outputDiv = document.createElement('div');
    outputDiv.id = 'output';
    outputDiv.style.width = '1000px';
    document.body.appendChild(outputDiv);
  });

  it('should generate beams for eighth notes and link them properly to notes', () => {
    const musicData: Measure[] = [
      {
        keySignature: 'C',
        pattern: ['8', '8', '8', '8', 'q', 'q'],
        trebleSteps: [['C4'], ['D4'], ['E4'], ['F4'], ['G4'], ['A4']],
        bassSteps: [[], [], [], [], [], []],
        staffType: 'treble'
      }
    ];

    const state: RenderState = {
      musicData,
      currentStepIndex: 0,
      activeMidiNotes: new Set(),
      suppressedNotes: new Set(),
    };

    const selectors: RenderSelectors = {
      getStepInfo: (index: number) => ({ measureIdx: 0, stepIdx: index }),
      getRenderedMeasuresCount: () => 1
    };

    renderScore(outputDiv, { measuresPerLine: 1, linesCount: 1, staffType: 'treble' }, state, selectors);

    // Check for beams in the output SVG
    const svg = outputDiv.querySelector('svg');
    expect(svg).not.toBeNull();

    const beams = svg?.querySelectorAll('.vf-beam');
    expect(beams?.length).toBeGreaterThan(0);

    // Check for flags - there should be none for beamed notes
    const flags = svg?.querySelectorAll('.vf-flag');
    expect(flags?.length).toBe(0);
  });
});
