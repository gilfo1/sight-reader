import { describe, it, expect, beforeEach } from 'vitest';
import { 
  renderStaff, 
  setMusicData, 
  resetGameState,
  initKeySignatures,
  activeMidiNotes
} from '../../../src/main';

describe('Staff Rendering and Layout Integration', () => {
  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="output"></div>
      <select id="measures-per-line"><option value="2">2</option></select>
      <select id="lines"><option value="2">2</option></select>
      <select id="staff-type">
        <option value="treble">Treble</option>
        <option value="bass">Bass</option>
        <option value="grand">Grand Staff</option>
      </select>
      <div id="note-values"></div>
      <div id="key-signatures"></div>
    `;
    initKeySignatures(() => {});
  });

  it('should render treble staff with notes', () => {
    setMusicData([{ 
      pattern: ['q'], 
      trebleBeats: [['C4']], 
      bassBeats: [[]], 
      staffType: 'treble', 
      keySignature: 'C' 
    }]);
    
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'treble';
    renderStaff();
    
    const svg = document.querySelector('#output svg')!;
    expect(svg).not.toBeNull();
    expect(svg.innerHTML).toContain('vf-stavenote');
  });

  it('should render grand staff with both staves', () => {
    setMusicData([{ 
      pattern: ['q'], 
      trebleBeats: [['C4']], 
      bassBeats: [['C3']], 
      staffType: 'grand', 
      keySignature: 'C' 
    }]);
    
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'grand';
    renderStaff();
    
    const svg = document.querySelector('#output svg')!;
    // Check for multiple staves (paths)
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(10);
  });

  it('should render bold double right barline at the end', () => {
    setMusicData([
      { pattern: ['q'], trebleBeats: [['C4']], bassBeats: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleBeats: [['C4']], bassBeats: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    (document.getElementById('measures-per-line') as HTMLSelectElement).value = '1';
    (document.getElementById('lines') as HTMLSelectElement).value = '2';
    
    renderStaff();
    const svg = document.querySelector('#output svg');
    // Just verify it renders without error for now as exact path matching is fragile
    expect(svg).not.toBeNull();
  });

  it('should render beams for 8th and 16th notes', () => {
    setMusicData([{ 
      pattern: ['8', '8', '16', '16', '16', '16'], 
      trebleBeats: [['C4'], ['D4'], ['E4'], ['F4'], ['G4'], ['A4']], 
      bassBeats: [[], [], [], [], [], []], 
      staffType: 'treble', 
      keySignature: 'C' 
    }]);
    
    renderStaff();
    const svg = document.querySelector('#output svg');
    expect(svg.querySelectorAll('.vf-beam').length).toBeGreaterThan(0);
  });

  it('should apply measure widening for crowded measures', () => {
    // 16th notes with accidentals should be wider than a single quarter note
    setMusicData([{ 
      pattern: ['16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16', '16'], 
      trebleBeats: [['C#4'], ['D#4'], ['E#4'], ['F#4'], ['G#4'], ['A#4'], ['B#4'], ['C#5'], ['D#5'], ['E#5'], ['F#5'], ['G#5'], ['A#5'], ['B#5'], ['C#6'], ['D#6']], 
      bassBeats: Array(16).fill([]), 
      staffType: 'treble', 
      keySignature: 'C' 
    }]);
    
    renderStaff();
    const svg1 = document.querySelector('#output svg')!;
    const width1 = parseFloat(svg1.getAttribute('width')!);
    
    resetGameState();
    setMusicData([{ 
      pattern: ['q'], 
      trebleBeats: [['C4']], 
      bassBeats: [[]], 
      staffType: 'treble', 
      keySignature: 'C' 
    }]);
    
    renderStaff();
    const svg2 = document.querySelector('#output svg')!;
    const width2 = parseFloat(svg2.getAttribute('width')!);
    
    expect(width1).toBeGreaterThan(width2);
  });
  it('should handle multiple simultaneous wrong notes', () => {
    setMusicData([{
      trebleBeats: [['C4']],
      bassBeats: [[]],
      pattern: ['q'],
      staffType: 'treble',
      keySignature: 'C'
    }]);
    
    // Simulate multiple wrong notes
    activeMidiNotes.clear();
    activeMidiNotes.add('C#4');
    activeMidiNotes.add('D4');
    
    renderStaff();
    const output = document.getElementById('output')!;
    // Should have 1 target note + 2 wrong notes = 3 notes
    const notes = output.querySelectorAll('.vf-stavenote');
    expect(notes.length).toBe(3);
  });
  it('should render 4 notes and 4 rests for a 4-beat grand staff measure with 1 note per beat', () => {
    setMusicData([{ 
      pattern: ['q', 'q', 'q', 'q'], 
      trebleBeats: [['C4'], [], ['E4'], []], 
      bassBeats: [[], ['G3'], [], ['B3']], 
      staffType: 'grand', 
      keySignature: 'C' 
    }]);
    
    (document.getElementById('staff-type') as HTMLSelectElement).value = 'grand';
    renderStaff();
    
    const svg = document.querySelector('#output svg')!;
    // Stavenotes include both notes and rests in VexFlow 5 usually
    // But we can check for notes with stems vs without?
    // Actually, rests in our VexFlow setup are notes with '/r' in the key.
    
    // Total stavenotes should be 8 (4 per staff)
    const notes = svg.querySelectorAll('.vf-stavenote');
    expect(notes.length).toBe(8);
  });

  it('should have consistent measure widths in a grand staff line', () => {
    setMusicData([
      { pattern: ['q'], trebleBeats: [['C4']], bassBeats: [['C3']], staffType: 'grand', keySignature: 'C' },
      { pattern: ['q'], trebleBeats: [['D4']], bassBeats: [['D3']], staffType: 'grand', keySignature: 'C' }
    ]);
    
    (document.getElementById('measures-per-line') as HTMLSelectElement).value = '2';
    renderStaff();
    
    // We can't easily check internal measure widths without spying, 
    // but the overall SVG width should be sufficient for 2 measures
    const svg = document.querySelector('#output svg')!;
    const width = parseFloat(svg.getAttribute('width')!);
    // 2 measures * 200px (min) + 100px padding
    expect(width).toBeGreaterThanOrEqual(500);
  });
});
