import {beforeEach, describe, expect, it} from 'vitest';
import {generateScoreData, initKeySignatures, renderScore, resetGameState, setMusicData} from '@/main';

describe('Performance and Stress Regression', () => {
  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="output"></div>
      <div id="controls">
        <select id="measures-per-line"><option value="8">8</option></select>
        <select id="notes-per-step"><option value="10">10</option></select>
        <select id="lines"><option value="10">10</option></select>
        <select id="staff-type"><option value="grand">Grand Staff</option></select>
        <select id="min-note"><option value="A0">A0</option></select>
        <select id="max-note"><option value="C8">C8</option></select>
        <div id="note-values"><input type="checkbox" value="q" checked></div>
        <div id="key-signatures"></div>
      </div>
    `;
    initKeySignatures(() => {});
  });

  it('should render 100 dense measures without crashing', () => {
    // 10 lines * 10 measures = 100 measures
    const config = {
      measuresPerLine: 10,
      linesCount: 10,
      staffType: 'grand',
      notesPerStep: 10,
      minNote: 'A0',
      maxNote: 'C8',
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C'],
      isChromatic: true,
      maxReach: 12,
      isAdaptive: false
    };
    
    setMusicData(generateScoreData(config));
    expect(() => renderScore()).not.toThrow();
    const svg = document.querySelector('#output svg');
    expect(svg).not.toBeNull();
  });

  it('should handle rapid re-renders during fuzz-like input changes', { timeout: 30000 }, () => {
    for (let i = 0; i < 20; i++) {
      (document.getElementById('staff-type') as any).value = i % 2 === 0 ? 'treble' : 'grand';
        generateScoreData();
        renderScore();
    }
    expect(document.querySelector('#output svg')).not.toBeNull();
  });
});
