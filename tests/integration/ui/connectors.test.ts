import { describe, it, expect, beforeEach } from 'vitest';
import { 
  renderScore, 
  setMusicData, 
  resetGameState,
  initKeySignatures,
  getUIConfig
} from '@/main';

describe('Staff Connectors', () => {
  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="output"></div>
      <select id="measures-per-line"><option value="4">4</option></select>
      <select id="lines"><option value="1">1</option></select>
      <select id="staff-type">
        <option value="grand">Grand Staff</option>
        <option value="treble">Treble</option>
        <option value="bass">Bass</option>
      </select>
      <div id="note-values"></div>
      <div id="key-signatures"></div>
    `;
    initKeySignatures(() => {});
  });

  it('should have a vertical line at the beginning of a grand staff line', () => {
    setMusicData([{ 
      pattern: ['q'], 
      trebleSteps: [['C4']],
      bassSteps: [['C3']],
      staffType: 'grand', 
      keySignature: 'C' 
    }]);
    
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'grand';
    renderScore(null, getUIConfig());
    
    const svg = document.querySelector('#output svg')!;
    const paths = Array.from(svg.querySelectorAll('path'));
    const rects = Array.from(svg.querySelectorAll('rect'));
    
    const startX = 50;
    const verticalLines = [...paths, ...rects].filter(el => {
        if (el.tagName === 'path') {
            const d = (el as SVGPathElement).getAttribute('d') || '';
            const match = d.match(/M\s*(\d+(\.\d+)?)\s+(\d+(\.\d+)?)\s*L\s*(\d+(\.\d+)?)\s+(\d+(\.\d+)?)/);
            if (match) {
                const x1 = parseFloat(match[1]!);
                const x2 = parseFloat(match[5]!);
                const y1 = parseFloat(match[3]!);
                const y2 = parseFloat(match[7]!);
                return Math.abs(x1 - startX) < 5 && Math.abs(x1 - x2) < 0.1 && Math.abs(y2 - y1) > 100;
            }
        } else if (el.tagName === 'rect') {
            const x = parseFloat((el as SVGRectElement).getAttribute('x') || '0');
            const width = parseFloat((el as SVGRectElement).getAttribute('width') || '0');
            const height = parseFloat((el as SVGRectElement).getAttribute('height') || '0');
            return Math.abs(x - startX) < 5 && width < 5 && height > 100;
        }
        return false;
    });
    
    expect(verticalLines.length).toBeGreaterThan(0);
  });

  it('should have a vertical line at the beginning of a treble staff line', () => {
    setMusicData([{ 
      pattern: ['q'], 
      trebleSteps: [['C4']],
      bassSteps: [[]],
      staffType: 'treble', 
      keySignature: 'C' 
    }]);
    
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'treble';
    renderScore(null, getUIConfig());
    
    const svg = document.querySelector('#output svg')!;
    const paths = Array.from(svg.querySelectorAll('path'));
    const rects = Array.from(svg.querySelectorAll('rect'));
    
    const startX = 50;
    const verticalLines = [...paths, ...rects].filter(el => {
        if (el.tagName === 'path') {
            const d = (el as SVGPathElement).getAttribute('d') || '';
            const match = d.match(/M\s*(\d+(\.\d+)?)\s+(\d+(\.\d+)?)\s*L\s*(\d+(\.\d+)?)\s+(\d+(\.\d+)?)/);
            if (match) {
                const x1 = parseFloat(match[1]!);
                const x2 = parseFloat(match[5]!);
                const y1 = parseFloat(match[3]!);
                const y2 = parseFloat(match[7]!);
                return Math.abs(x1 - startX) < 5 && Math.abs(x1 - x2) < 0.1 && Math.abs(y2 - y1) >= 40;
            }
        } else if (el.tagName === 'rect') {
            const x = parseFloat((el as SVGRectElement).getAttribute('x') || '0');
            const width = parseFloat((el as SVGRectElement).getAttribute('width') || '0');
            const height = parseFloat((el as SVGRectElement).getAttribute('height') || '0');
            return Math.abs(x - startX) < 5 && width < 5 && height >= 40;
        }
        return false;
    });
    
    expect(verticalLines.length).toBeGreaterThan(0);
  });

  it('should render clefs and time signatures on the first measure', () => {
    setMusicData([{ 
      pattern: ['q'], 
      trebleSteps: [['C4']],
      bassSteps: [['C3']],
      staffType: 'grand', 
      keySignature: 'C' 
    }]);
    
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'grand';
    renderScore(null, getUIConfig());
    
    const svg = document.querySelector('#output svg')!;
    // VexFlow 4 uses classes like .vf-clef and .vf-timesignature (or similar)
    // Let's check for their presence.
    // Actually, it might be easier to check for paths that look like clefs.
    
    // In many VexFlow versions, clefs and time signatures have specific classes.
    const clefs = svg.querySelectorAll('.vf-clef');
    const timeSigs = svg.querySelectorAll('.vf-timesignature');
    
    // For grand staff, we expect 2 clefs and 2 time signatures (one for each staff)
    expect(clefs.length).toBeGreaterThanOrEqual(2);
    expect(timeSigs.length).toBeGreaterThanOrEqual(2);
  });

  it('should render key signatures when not in C major', () => {
    setMusicData([{ 
      pattern: ['q'], 
      trebleSteps: [['G4']],
      bassSteps: [['G3']],
      staffType: 'grand', 
      keySignature: 'G' 
    }]);
    
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'grand';
    renderScore(null, getUIConfig());
    
    const svg = document.querySelector('#output svg')!;
    // Key signatures usually have .vf-keysignature class
    const keySigs = svg.querySelectorAll('.vf-keysignature');
    
    // Expect at least 2 key signatures (treble and bass)
    expect(keySigs.length).toBeGreaterThanOrEqual(2);
  });

  it('should render single right barline for intermediate measures', () => {
    setMusicData([
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [['C3']], staffType: 'grand', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['D4']], bassSteps: [['D3']], staffType: 'grand', keySignature: 'C' }
    ]);
    
    (document.getElementById('measures-per-line') as HTMLSelectElement).value = '2';
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'grand';
    renderScore(null, getUIConfig());
    
    const svg = document.querySelector('#output svg')!;
    const connectorLines = Array.from(svg.querySelectorAll('path, rect')).filter((el) => {
      if (el.tagName === 'path') {
        const d = (el as SVGPathElement).getAttribute('d') || '';
        const match = d.match(/M\s*(\d+(\.\d+)?)\s+(\d+(\.\d+)?)\s*L\s*(\d+(\.\d+)?)\s+(\d+(\.\d+)?)/);
        if (!match) {
          return false;
        }
        const x1 = parseFloat(match[1]!);
        const x2 = parseFloat(match[5]!);
        const y1 = parseFloat(match[3]!);
        const y2 = parseFloat(match[7]!);
        return Math.abs(x1 - x2) < 0.1 && Math.abs(y2 - y1) > 100;
      }

      const width = parseFloat((el as SVGRectElement).getAttribute('width') || '0');
      const height = parseFloat((el as SVGRectElement).getAttribute('height') || '0');
      return width < 5 && height > 100;
    });

    expect(connectorLines.length).toBeGreaterThanOrEqual(3);
  });

  it('should render bold double right barline at the very end', () => {
    setMusicData([
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    (document.getElementById('measures-per-line') as HTMLSelectElement).value = '1';
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'treble';
    renderScore(null, getUIConfig());
    
    const svg = document.querySelector('#output svg')!;
    // Bold double right barline is usually several rects or paths.
    // In VexFlow 4 it often uses a thick rect (width=3) and a thin one (width=1).
    const rects = Array.from(svg.querySelectorAll('rect'));
    
    // Total width for 1 measure is around 250 (50 start + 200 width)
    const thickRect = rects.find(r => {
        const x = parseFloat(r.getAttribute('x') || '0');
        const w = parseFloat(r.getAttribute('width') || '0');
        return x > 240 && w >= 3;
    });
    
    expect(thickRect).toBeDefined();
  });

  it('should only render clefs and time signatures on the first measure of each line', () => {
    setMusicData([
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['D4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    (document.getElementById('measures-per-line') as HTMLSelectElement).value = '2';
    (document.getElementById('lines') as HTMLSelectElement).value = '1';
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'treble';
    renderScore(null, getUIConfig());
    
    const svg = document.querySelector('#output svg')!;
    const clefs = svg.querySelectorAll('.vf-clef');
    const timeSigs = svg.querySelectorAll('.vf-timesignature');
    
    // 2 measures in 1 line -> only 1 clef and 1 time signature
    expect(clefs.length).toBe(1);
    expect(timeSigs.length).toBe(1);
  });
});
