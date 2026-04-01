import { stats, resetStats } from '../engine/state';

const elements = {
  get played() { return document.getElementById('stats-played'); },
  get correct() { return document.getElementById('stats-correct'); },
  get wrong() { return document.getElementById('stats-wrong'); },
  get accuracy() { return document.getElementById('stats-accuracy'); },
  get streak() { return document.getElementById('stats-streak'); },
  get maxStreak() { return document.getElementById('stats-max-streak'); },
  get resetButton() { return document.getElementById('reset-stats'); }
};

export function updateStatsUI(): void {
  if (elements.played) elements.played.textContent = stats.notesPlayed.toString();
  if (elements.correct) elements.correct.textContent = stats.correctNotes.toString();
  if (elements.wrong) elements.wrong.textContent = stats.wrongNotes.toString();
  
  if (elements.accuracy) {
    const accuracy = stats.notesPlayed === 0 
      ? 0 
      : Math.round((stats.correctNotes / stats.notesPlayed) * 100);
    elements.accuracy.textContent = accuracy + '%';
  }
  
  if (elements.streak) elements.streak.textContent = stats.currentStreak.toString();
  if (elements.maxStreak) elements.maxStreak.textContent = stats.maxStreak.toString();
}

export function initStatsUI(): void {
  elements.resetButton?.addEventListener('click', () => {
    resetStats();
    updateStatsUI();
  });
  updateStatsUI();
}
