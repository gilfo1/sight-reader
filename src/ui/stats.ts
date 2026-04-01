import { stats, resetStats } from '@/engine/state';

function getEl<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const ui = {
  get played() { return getEl<HTMLElement>('stats-played'); },
  get correct() { return getEl<HTMLElement>('stats-correct'); },
  get wrong() { return getEl<HTMLElement>('stats-wrong'); },
  get accuracy() { return getEl<HTMLElement>('stats-accuracy'); },
  get streak() { return getEl<HTMLElement>('stats-streak'); },
  get maxStreak() { return getEl<HTMLElement>('stats-max-streak'); },
  get resetButton() { return getEl<HTMLElement>('reset-stats'); }
};

export function updateStatsUI(): void {
  if (ui.played) ui.played.textContent = stats.notesPlayed.toString();
  if (ui.correct) ui.correct.textContent = stats.correctNotes.toString();
  if (ui.wrong) ui.wrong.textContent = stats.wrongNotes.toString();
  
  if (ui.accuracy) {
    const accuracy = stats.notesPlayed === 0 
      ? 0 
      : Math.round((stats.correctNotes / stats.notesPlayed) * 100);
    ui.accuracy.textContent = accuracy + '%';
  }
  
  if (ui.streak) ui.streak.textContent = stats.currentStreak.toString();
  if (ui.maxStreak) ui.maxStreak.textContent = stats.maxStreak.toString();
}

export function initStatsUI(): void {
  ui.resetButton?.addEventListener('click', () => {
    resetStats();
    updateStatsUI();
  });
  updateStatsUI();
}
