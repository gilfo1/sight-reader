import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Factory } from 'vexflow';
import { renderScore } from '@/rendering/score-renderer';
import { Measure } from '@/engine/state';

interface RenderContextShape {
  save: () => void;
  restore: () => void;
  setFillStyle: (value: string) => void;
  fillRect: (...args: number[]) => void;
  beginPath: () => void;
  moveTo: (...args: number[]) => void;
  lineTo: (...args: number[]) => void;
  stroke: () => void;
  fill: () => void;
  closePath: () => void;
  setStrokeStyle: (value: string) => void;
  setFont: (font: string) => void;
  fillText: (text: string, x: number, y: number) => void;
  measureText: () => { width: number };
}

describe('Highlighter Rendering', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = '<div id="output"></div>';
  });

  it('should draw highlight with reasonable width and position', (): void => {
    const musicData: Measure[] = [{
      pattern: ['q', 'q', 'q', 'q'],
      trebleSteps: [['C4'], ['E4'], ['G4'], ['C5']],
      bassSteps: [[], [], [], []],
      keySignature: 'C',
      staffType: 'treble'
    }];

    const fillRectSpy = vi.fn();
    const mockContext: RenderContextShape = {
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

    const originalGetContext = Factory.prototype.getContext;
    Factory.prototype.getContext = () => mockContext as unknown as ReturnType<typeof Factory.prototype.getContext>;

    try {
      renderScore(document.getElementById('output')!, { 
        measuresPerLine: 4, 
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

      expect(fillRectSpy).toHaveBeenCalled();
      let [, , width] = fillRectSpy.mock.calls[0];
      expect(width).toBe(22);

      // Now with accidental
      fillRectSpy.mockClear();
      const musicData2: Measure[] = [{
        pattern: ['q'],
        trebleSteps: [['C#4']],
        bassSteps: [[]],
        keySignature: 'C',
        staffType: 'treble'
      }];
      renderScore(document.getElementById('output')!, { staffType: 'treble' }, {
        musicData: musicData2,
        currentStepIndex: 0,
        activeMidiNotes: new Set(),
        suppressedNotes: new Set()
      }, {
        getStepInfo: (i: number) => ({ measureIdx: 0, stepIdx: i })
      });
      [, , width] = fillRectSpy.mock.calls[0];
      expect(width).toBeGreaterThan(22);
      
    } finally {
      Factory.prototype.getContext = originalGetContext;
    }
  });
});
