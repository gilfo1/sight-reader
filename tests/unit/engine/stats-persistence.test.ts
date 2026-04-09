import { describe, it, expect, beforeEach } from 'vitest';
import { resetStats, recordCorrectNote, recordWrongNote } from '@/engine/state';
import { loadFromStorage } from '@/utils/storage';

describe('Stats Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStats();
  });

  it('should save stats to localStorage when recording a correct note', () => {
    recordCorrectNote('C4', 'C', 500);
    const savedStats = loadFromStorage<any>('app-stats');
    expect(savedStats).not.toBeNull();
    expect(savedStats.correctNotes).toBe(1);
    expect(savedStats.notesPlayed).toBe(1);
    expect(savedStats.averageCorrectNoteTime).toBe(500);
  });

  it('should save stats to localStorage when recording a wrong note', () => {
    recordWrongNote('D4', ['C4'], 'C');
    const savedStats = loadFromStorage<any>('app-stats');
    expect(savedStats).not.toBeNull();
    expect(savedStats.wrongNotes).toBe(1);
    expect(savedStats.notesPlayed).toBe(1);
  });

  it('should clear stats in localStorage when resetting stats', () => {
    recordCorrectNote('C4', 'C', 500);
    resetStats();
    const savedStats = loadFromStorage<any>('app-stats');
    expect(savedStats.correctNotes).toBe(0);
    expect(savedStats.notesPlayed).toBe(0);
  });
});
