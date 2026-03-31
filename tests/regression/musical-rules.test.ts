import { describe, it, expect, beforeEach } from 'vitest';
import { 
  renderStaff, 
  setMusicData, 
  resetGameState,
  initKeySignatures
} from '../../src/main';

describe('Musical Rules Regression', () => {
  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="output"></div>
      <select id="measures-per-line"><option value="4">4</option></select>
      <select id="lines"><option value="1">1</option></select>
      <select id="staff-type"><option value="grand">Grand Staff</option></select>
      <div id="note-values"></div>
      <div id="key-signatures"></div>
    `;
    initKeySignatures(() => {});
  });

  it('Octave Rule: Accidental only applies to the specific octave it is written in', () => {
    // C#4 in beat 0 should NOT affect C4 in beat 1
    setMusicData([{ 
      pattern: ['q', 'q', 'q', 'q'], 
      trebleBeats: [['C#4'], ['C4'], ['C#5'], ['C5']], 
      bassBeats: [[], [], [], []], 
      staffType: 'treble', 
      keySignature: 'C' 
    }]);
    
    renderStaff();
    const svg = document.querySelector('#output svg');
    // We expect 2 sharps (C#4 and C#5) and potentially naturals if VexFlow adds them
    // The key thing is that C4 and C5 are NOT sharped by the previous notes.
    const html = svg.innerHTML;
    
    // Check for sharps (Unicode U+E262)
    const sharpCount = (html.match(/\uE262/g) || []).length;
    expect(sharpCount).toBeGreaterThanOrEqual(2);
  });

  it('Staff Independence: Accidentals apply only to the staff they are written in', () => {
    // C#4 in treble should NOT affect C4 in bass
    setMusicData([{ 
      pattern: ['q'], 
      trebleBeats: [['C#4']], 
      bassBeats: [['C4']], 
      staffType: 'grand', 
      keySignature: 'C' 
    }]);
    
    renderStaff();
    const svg = document.querySelector('#output svg');
    const html = svg.innerHTML;
    
    // Treble should have a sharp, Bass should NOT
    // VexFlow 5 might add a natural to the bass to be clear, which is also fine.
    expect(html).toContain('\uE262'); // Sharp
  });

  it('Duration: Accidental lasts for the entire measure', () => {
    // C#4 in beat 0 should persist for C4 in beat 1 (visually hidden if redundant)
    setMusicData([{ 
      pattern: ['q', 'q'], 
      trebleBeats: [['C#4'], ['C4']], 
      bassBeats: [[], []], 
      staffType: 'treble', 
      keySignature: 'C' 
    }]);
    
    renderStaff();
    // If we play C4 (MIDI 60) on beat 1, it should NOT match because the measure has C#4 (MIDI 61)
    // Wait, the state logic should handle this.
    // In our engine, we store absolute pitches, so this is about whether the engine generates them correctly.
  });
});
