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
  get resetButton() { return getElementById<HTMLElement>('reset-stats'); },
  get closeButton() { return getElementById<HTMLElement>('stats-close'); },
  get details() { return getElementById<HTMLDetailsElement>('stats-details'); }
};

function setTextContent(element: HTMLElement | null, value: string): void {
  if (element) {
    element.textContent = value;
  }
}

function getAccuracyPercentage(): string {
  if (stats.notesPlayed === 0) {
    return '0%';
  }

  return `${Math.round((stats.correctNotes / stats.notesPlayed) * 100)}%`;
}

export function updateStatsUI(): void {
  setTextContent(ui.played, stats.notesPlayed.toString());
  setTextContent(ui.correct, stats.correctNotes.toString());
  setTextContent(ui.wrong, stats.wrongNotes.toString());
  setTextContent(ui.accuracy, getAccuracyPercentage());
  setTextContent(ui.streak, stats.currentStreak.toString());
  setTextContent(ui.maxStreak, stats.maxStreak.toString());
  setTextContent(ui.wrongOctave, stats.wrongOctaveCount.toString());
  setTextContent(ui.keyError, stats.keySignatureNotHonoredCount.toString());
  setTextContent(ui.avgTime, `${(stats.averageCorrectNoteTime / 1000).toFixed(2)}s`);
}

export function initStatsUI(): void {
  ui.resetButton?.addEventListener('click', () => {
    resetStats();
    updateStatsUI();
  });
  ui.closeButton?.addEventListener('click', (e) => {
    e.preventDefault();
    if (ui.details) {
      ui.details.open = false;
    }
  });
  updateStatsUI();
}
