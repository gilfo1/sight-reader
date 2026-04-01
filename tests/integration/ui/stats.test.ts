import { describe, it, expect, beforeEach } from 'vitest';
import { initStatsUI, updateStatsUI } from '@/ui/stats';
import { stats, resetStats } from '@/engine/state';

describe('Stats UI Integration', () => {
  beforeEach(() => {
    resetStats();
    document.body.innerHTML = `
      <div id="stats-played">0</div>
      <div id="stats-correct">0</div>
      <div id="stats-wrong">0</div>
      <div id="stats-accuracy">0%</div>
      <div id="stats-streak">0</div>
      <div id="stats-max-streak">0</div>
      <button id="reset-stats">Reset</button>
    `;
    initStatsUI();
  });

  it('should update UI when stats change and updateStatsUI is called', () => {
    stats.notesPlayed = 10;
    stats.correctNotes = 9;
    stats.wrongNotes = 1;
    stats.currentStreak = 5;
    stats.maxStreak = 7;

    updateStatsUI();

    expect(document.getElementById('stats-played')?.textContent).toBe('10');
    expect(document.getElementById('stats-correct')?.textContent).toBe('9');
    expect(document.getElementById('stats-wrong')?.textContent).toBe('1');
    expect(document.getElementById('stats-accuracy')?.textContent).toBe('90%');
    expect(document.getElementById('stats-streak')?.textContent).toBe('5');
    expect(document.getElementById('stats-max-streak')?.textContent).toBe('7');
  });

  it('should reset stats and UI when reset button is clicked', () => {
    stats.notesPlayed = 10;
    stats.correctNotes = 9;
    updateStatsUI();
    
    expect(document.getElementById('stats-played')?.textContent).toBe('10');

    document.getElementById('reset-stats')?.click();

    expect(stats.notesPlayed).toBe(0);
    expect(document.getElementById('stats-played')?.textContent).toBe('0');
  });

  it('should handle zero played notes for accuracy', () => {
    stats.notesPlayed = 0;
    updateStatsUI();
    expect(document.getElementById('stats-accuracy')?.textContent).toBe('0%');
  });
});
