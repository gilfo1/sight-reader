import { stats, resetStats } from '@/engine/state';
import { getElementById } from '@/ui/dom';

const ui = {
  get played() { return getElementById<HTMLElement>('stats-played'); },
  get correct() { return getElementById<HTMLElement>('stats-correct'); },
  get wrong() { return getElementById<HTMLElement>('stats-wrong'); },
  get accuracy() { return getElementById<HTMLElement>('stats-accuracy'); },
  get streak() { return getElementById<HTMLElement>('stats-streak'); },
  get maxStreak() { return getElementById<HTMLElement>('stats-max-streak'); },
  get wrongOctave() { return getElementById<HTMLElement>('stats-wrong-octave'); },
  get keyError() { return getElementById<HTMLElement>('stats-key-error'); },
  get avgTime() { return getElementById<HTMLElement>('stats-avg-time'); },
  get resetButton() { return getElementById<HTMLElement>('reset-stats'); }
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
  
  if (ui.wrongOctave) ui.wrongOctave.textContent = stats.wrongOctaveCount.toString();
  if (ui.keyError) ui.keyError.textContent = stats.keySignatureNotHonoredCount.toString();
  if (ui.avgTime) {
    const seconds = (stats.averageCorrectNoteTime / 1000).toFixed(2);
    ui.avgTime.textContent = seconds + 's';
  }
}

export function initStatsUI(): void {
  ui.resetButton?.addEventListener('click', () => {
    resetStats();
    updateStatsUI();
  });
  updateStatsUI();
}
