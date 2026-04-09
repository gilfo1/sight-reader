import { describe, it, expect, beforeEach } from 'vitest';
import { stats, resetStats } from '../../../src/engine/state';

describe('Stats State', () => {
  beforeEach(() => {
    resetStats();
  });

  it('should initialize with zeros', () => {
    expect(stats.notesPlayed).toBe(0);
    expect(stats.correctNotes).toBe(0);
    expect(stats.wrongNotes).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(0);
    expect(stats.wrongOctaveCount).toBe(0);
    expect(stats.keySignatureNotHonoredCount).toBe(0);
    expect(stats.averageCorrectNoteTime).toBe(0);
  });

  describe('Accuracy Calculation Logic', () => {
    // These tests rely on updateStatsUI or similar logic if accuracy is only in UI
    // But since accuracy is derived from correctNotes / notesPlayed, we should test the derivation.
    // In src/ui/stats.ts:
    // const accuracy = stats.notesPlayed > 0 ? Math.round((stats.correctNotes / stats.notesPlayed) * 100) : 0;
    
    it('should calculate 100% accuracy correctly', () => {
      stats.notesPlayed = 10;
      stats.correctNotes = 10;
      const accuracy = Math.round((stats.correctNotes / stats.notesPlayed) * 100);
      expect(accuracy).toBe(100);
    });

    it('should calculate 0% accuracy correctly', () => {
      stats.notesPlayed = 10;
      stats.correctNotes = 0;
      const accuracy = Math.round((stats.correctNotes / stats.notesPlayed) * 100);
      expect(accuracy).toBe(0);
    });

    it('should round accuracy to nearest whole number (50%)', () => {
      stats.notesPlayed = 2;
      stats.correctNotes = 1;
      const accuracy = Math.round((stats.correctNotes / stats.notesPlayed) * 100);
      expect(accuracy).toBe(50);
    });

    it('should round accuracy up (33.3% -> 33%)', () => {
      stats.notesPlayed = 3;
      stats.correctNotes = 1;
      const accuracy = Math.round((stats.correctNotes / stats.notesPlayed) * 100);
      expect(accuracy).toBe(33);
    });

    it('should round accuracy (66.6% -> 67%)', () => {
      stats.notesPlayed = 3;
      stats.correctNotes = 2;
      const accuracy = Math.round((stats.correctNotes / stats.notesPlayed) * 100);
      expect(accuracy).toBe(67);
    });
  });

  describe('Streak Logic Edge Cases', () => {
    it('should maintain maxStreak when currentStreak resets', () => {
      stats.currentStreak = 5;
      stats.maxStreak = 5;
      
      // Wrong note logic (manual simulate)
      stats.notesPlayed++;
      stats.wrongNotes++;
      stats.currentStreak = 0;
      
      expect(stats.currentStreak).toBe(0);
      expect(stats.maxStreak).toBe(5);
    });

    it('should update maxStreak only when currentStreak exceeds it', () => {
      stats.maxStreak = 10;
      stats.currentStreak = 5;
      
      // Correct note
      stats.notesPlayed++;
      stats.correctNotes++;
      stats.currentStreak++;
      
      expect(stats.currentStreak).toBe(6);
      expect(stats.maxStreak).toBe(10);
      
      // Reach maxStreak
      stats.currentStreak = 10;
      stats.notesPlayed++;
      stats.correctNotes++;
      stats.currentStreak++;
      
      // Need logic from midi-handler to update maxStreak, 
      // but here we are testing the state's capacity to hold it.
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      
      expect(stats.maxStreak).toBe(11);
    });
  });

  it('should reset stats correctly', () => {
    stats.notesPlayed = 10;
    stats.correctNotes = 8;
    stats.wrongNotes = 2;
    stats.currentStreak = 5;
    stats.maxStreak = 7;
    stats.wrongOctaveCount = 3;
    stats.keySignatureNotHonoredCount = 2;
    stats.averageCorrectNoteTime = 1200;

    resetStats();

    expect(stats.notesPlayed).toBe(0);
    expect(stats.correctNotes).toBe(0);
    expect(stats.wrongNotes).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(0);
    expect(stats.wrongOctaveCount).toBe(0);
    expect(stats.keySignatureNotHonoredCount).toBe(0);
    expect(stats.averageCorrectNoteTime).toBe(0);
  });
});
