import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Factory } from 'vexflow';
import { renderStaff } from '../../../src/rendering/renderer';
import { Measure } from '../../../src/engine/state';

describe('Highlighter Rendering', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = '<div id="output"></div>';
  });

  it('should draw highlight with reasonable width and position', (): void => {
    const musicData: Measure[] = [{
      pattern: ['q', 'q', 'q', 'q'],
      trebleBeats: [['C4'], ['E4'], ['G4'], ['C5']],
      bassBeats: [[], [], [], []],
      keySignature: 'C'
    }];

    // Mock Factory to intercept fillRect
    const fillRectSpy = vi.fn();
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      setFillStyle: vi.fn(),
      fillRect: fillRectSpy,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      setStrokeStyle: vi.fn(),
      setFont: vi.fn(),
      fillText: vi.fn(),
      measureText: (): { width: number } => ({ width: 10 }),
    };

    // We need to mock VexFlow Factory or at least the context it returns
    // This is tricky because Factory is used inside renderStaff
    // Maybe we can spy on the canvas context instead if VexFlow uses a real canvas?
    // In Vitest/JSDOM, it might be using a mock canvas.

    // Let's try to use the real Factory but mock its context
    const originalGetContext = Factory.prototype.getContext;
    Factory.prototype.getContext = () => mockContext as any;

    try {
      renderStaff(document.getElementById('output')!, { 
        measuresPerLine: 4, 
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

      expect(fillRectSpy).toHaveBeenCalled();
      let [x, y, width, height] = fillRectSpy.mock.calls[0];
      
      console.log('Highlight 1 (C4):', { x, y, width, height });
      expect(width).toBe(22);

      // Now with accidental
      fillRectSpy.mockClear();
      const musicData2: Measure[] = [{
        pattern: ['q'],
        trebleBeats: [['C#4']],
        bassBeats: [[]],
        keySignature: 'C'
      }];
      renderStaff(document.getElementById('output')!, { staffType: 'treble' }, {
        musicData: musicData2,
        currentBeatIndex: 0,
        activeMidiNotes: new Set(),
        suppressedNotes: new Set()
      }, {
        getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
      });
      [x, y, width, height] = fillRectSpy.mock.calls[0];
      console.log('Highlight 2 (C#4):', { x, y, width, height });
      // C#4 should be wider than C4 because of the accidental
      // C4 was 22, C#4 should have modLeftPx > 0
      expect(width).toBeGreaterThan(22);
      
    } finally {
      Factory.prototype.getContext = originalGetContext;
    }
  });
});
