import { describe, it, expect, beforeEach } from 'vitest';
import { renderScore, clearRenderCache } from '@/rendering/score-renderer';
import { Measure } from '@/engine/state';

describe('Measure Spacing and Crowding', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = '<div id="output"></div>';
    clearRenderCache();
  });

  it('should provide enough space for measures with many notes and accidentals', (): void => {
    const musicData: Measure[] = [{
      pattern: ['16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16'],
      trebleSteps: [
        ['C#4'], ['D#4'], ['E#4'], ['F#4'], 
        ['G#4'], ['A#4'], ['B#4'], ['C#5'], 
        ['D#5'], ['E#5'], ['F#5'], ['G#5'], 
        ['A#5'], ['B#5'], ['C#6'], ['D#6']
      ],
      bassSteps: Array(16).fill([]),
      keySignature: 'C',
      staffType: 'treble'
    }];
    
    renderScore(document.getElementById('output')!, { 
      measuresPerLine: 1, 
      linesCount: 1, 
      staffType: 'treble' 
    }, {
      musicData,
      currentStepIndex: 0,
      activeMidiNotes: new Set(),
      suppressedNotes: new Set()
    }, {
      getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
    });

    const denseSvg = document.querySelector('#output svg') as SVGSVGElement;
    const denseWidth = parseFloat(denseSvg.getAttribute('width') || '0');

    clearRenderCache();
    renderScore(document.getElementById('output')!, {
      measuresPerLine: 1,
      linesCount: 1,
      staffType: 'treble'
    }, {
      musicData: [{
        pattern: ['q'],
        trebleSteps: [['C4']],
        bassSteps: [[]],
        keySignature: 'C',
        staffType: 'treble'
      }],
      currentStepIndex: 0,
      activeMidiNotes: new Set(),
      suppressedNotes: new Set()
    }, {
      getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
    });

    const simpleSvg = document.querySelector('#output svg') as SVGSVGElement;
    const simpleWidth = parseFloat(simpleSvg.getAttribute('width') || '0');

    expect(denseWidth).toBeGreaterThan(simpleWidth);
  });

  it('should provide at least 200px width for a simple measure', (): void => {
    const musicData: Measure[] = [{
      pattern: ['q'],
      trebleSteps: [['C4']],
      bassSteps: [[]],
      keySignature: 'C',
      staffType: 'treble'
    }];

    renderScore(document.getElementById('output')!, { staffType: 'treble' }, {
      musicData,
      currentStepIndex: 0,
      activeMidiNotes: new Set(),
      suppressedNotes: new Set()
    }, {
      getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
    });

    const svg = document.querySelector('#output svg') as SVGSVGElement;
    expect(parseFloat(svg.getAttribute('width') || '0')).toBeGreaterThanOrEqual(250);
  });
});
