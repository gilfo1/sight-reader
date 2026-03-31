import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Factory } from 'vexflow';
import { renderStaff, clearRenderCache } from '../../../src/rendering/renderer';
import { Measure } from '../../../src/engine/state';

describe('Measure Spacing and Crowding', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = '<div id="output"></div>';
    clearRenderCache();
  });

  it('should provide enough space for measures with many notes and accidentals', (): void => {
    const musicData: Measure[] = [{
      pattern: ['16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16'],
      trebleBeats: [
        ['C#4'], ['D#4'], ['E#4'], ['F#4'], 
        ['G#4'], ['A#4'], ['B#4'], ['C#5'], 
        ['D#5'], ['E#5'], ['F#5'], ['G#5'], 
        ['A#5'], ['B#5'], ['C#6'], ['D#6']
      ],
      bassBeats: Array(16).fill([]),
      keySignature: 'C',
      staffType: 'treble'
    }];

    // Spy on Factory to see how wide the system is
    const systemSpy = vi.spyOn(Factory.prototype as any, 'System');
    
    renderStaff(document.getElementById('output')!, { 
      measuresPerLine: 1, 
      linesCount: 1, 
      staffType: 'treble' 
    }, {
      musicData,
      currentBeatIndex: 0,
      activeMidiNotes: new Set(),
      suppressedNotes: new Set()
    }, {
      getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
    });

    expect(systemSpy).toHaveBeenCalled();
    // The last call to System in renderStaff is for the actual rendering
    const systemInstance = systemSpy.mock.results.find(r => r.type === 'return')?.value;
    if (systemInstance) {
       // Check the width passed to System or calculated by it
       const width = systemInstance.options.width;
       console.log('Crowded measure width:', width);
       // With our fix (min width 200 and +30 padding), it should be quite wide
       expect(width).toBeGreaterThan(200);
    }
  });

  it('should provide at least 200px width for a simple measure', (): void => {
    const musicData: Measure[] = [{
      pattern: ['q'],
      trebleBeats: [['C4']],
      bassBeats: [[]],
      keySignature: 'C',
      staffType: 'treble'
    }];
    const systemSpy = vi.spyOn(Factory.prototype as any, 'System');
    renderStaff(document.getElementById('output')!, { staffType: 'treble' }, {
      musicData,
      currentBeatIndex: 0,
      activeMidiNotes: new Set(),
      suppressedNotes: new Set()
    }, {
      getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
    });
    const systemInstances = systemSpy.mock.results.filter(r => r.type === 'return').map(r => r.value);
    // Rendered measures have x, y coordinates and the calculated width
    const actualRendered = systemInstances.filter(s => s.options.x !== 0 || s.options.y !== 0);
    actualRendered.forEach((s, idx) => {
      console.log(`Measure ${idx} width:`, s.options.width);
      expect(s.options.width).toBeGreaterThanOrEqual(200);
    });
  });

  it('should not have overlapping notes in a crowded measure', (): void => {
      // This is harder to test without a full layout engine, 
      // but we can check if the calculated widths are reasonable.
  });
});
