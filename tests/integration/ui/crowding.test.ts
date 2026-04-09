import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Factory } from 'vexflow';
import { renderScore, clearRenderCache } from '@/rendering/score-renderer';
import { Measure } from '@/engine/state';

interface SystemOptionsShape {
  options: {
    width: number;
    x: number;
    y: number;
  };
}

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

    const systemSpy = vi.spyOn(Factory.prototype as unknown as { System: () => SystemOptionsShape }, 'System');
    
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

    expect(systemSpy).toHaveBeenCalled();
    const systemInstance = systemSpy.mock.results.find(r => r.type === 'return')?.value;
    if (systemInstance) {
       const width = systemInstance.options.width;
       expect(width).toBeGreaterThan(200);
    }
  });

  it('should provide at least 200px width for a simple measure', (): void => {
    const musicData: Measure[] = [{
      pattern: ['q'],
      trebleSteps: [['C4']],
      bassSteps: [[]],
      keySignature: 'C',
      staffType: 'treble'
    }];
    const systemSpy = vi.spyOn(Factory.prototype as unknown as { System: () => SystemOptionsShape }, 'System');
    renderScore(document.getElementById('output')!, { staffType: 'treble' }, {
      musicData,
      currentStepIndex: 0,
      activeMidiNotes: new Set(),
      suppressedNotes: new Set()
    }, {
      getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
    });
    const systemInstances = systemSpy.mock.results.filter(r => r.type === 'return').map(r => r.value);
    const actualRendered = systemInstances.filter(s => s.options.x !== 0 || s.options.y !== 0);
    actualRendered.forEach((s) => {
      expect(s.options.width).toBeGreaterThanOrEqual(200);
    });
  });
});
